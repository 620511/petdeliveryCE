// backend/src/controllers/privacy.controller.js
const crypto = require("crypto");
const prisma = require("../config/database");
const { audit, clientIp } = require("../services/audit.service");

const POLICY_VERSION = process.env.PRIVACY_POLICY_VERSION || "1.0";
const TERMS_VERSION = process.env.TERMS_VERSION || "1.0";
const COOKIE_VERSION = process.env.COOKIE_POLICY_VERSION || "1.0";

const publicUserSelect = {
  id: true, name: true, email: true, phone: true,
  avatarUrl: true, role: true, isActive: true,
  createdAt: true, updatedAt: true, lastLogin: true,
};

const versions = {
  privacy_policy: POLICY_VERSION,
  terms_of_use: TERMS_VERSION,
  cookies: COOKIE_VERSION,
};

async function getMyData(req, res) {
  const userId = req.user.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...publicUserSelect,
      addresses: true,
      consents: { orderBy: { createdAt: "desc" } },
      privacyRequests: { orderBy: { requestedAt: "desc" } },
      store: {
        select: {
          id: true, name: true, description: true, address: true,
          phone: true, isActive: true, isOpen: true, createdAt: true,
        },
      },
    },
  });
  if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

  await audit(req, { action: "PRIVACY_VIEW_DATA", resource: "user", resourceId: userId });
  res.json({ user, policyVersions: versions });
}

async function getConsents(req, res) {
  const consents = await prisma.consent.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
  });
  res.json({ versions, consents });
}

async function updateConsent(req, res) {
  const allowed = ["marketing", "analytics", "cookies"];
  const { type, granted } = req.body;
  if (!allowed.includes(type) || typeof granted !== "boolean") {
    return res.status(400).json({ error: "Consentimento inválido" });
  }

  const version = versions[type];
  const now = new Date();
  const consent = await prisma.consent.create({
    data: {
      userId: req.user.id,
      type,
      version,
      granted,
      grantedAt: granted ? now : null,
      revokedAt: granted ? null : now,
      ipAddress: clientIp(req),
      userAgent: req.get("user-agent")?.slice(0, 500) || null,
    },
  });

  await audit(req, {
    action: granted ? "CONSENT_GRANTED" : "CONSENT_REVOKED",
    resource: "consent",
    resourceId: consent.id,
    details: { type, version },
  });

  res.status(201).json(consent);
}

async function requestPrivacyAction(req, res) {
  const { type, description } = req.body;
  const allowed = ["access", "portability", "correction", "deletion", "consent", "information", "objection"];
  if (!allowed.includes(type)) return res.status(400).json({ error: "Tipo de solicitação inválido" });

  // Evita abertura repetida de dezenas de solicitações do mesmo tipo.
  const open = await prisma.privacyRequest.findFirst({
    where: { userId: req.user.id, type, status: { in: ["pending", "in_progress"] } },
  });
  if (open) return res.status(409).json({ error: "Já existe uma solicitação deste tipo em andamento", requestId: open.id });

  const requestedAt = new Date();
  const request = await prisma.privacyRequest.create({
    data: {
      userId: req.user.id,
      type,
      description: typeof description === "string" ? description.trim().slice(0, 2000) : null,
      requestedAt,
    },
  });

  await audit(req, {
    action: "PRIVACY_REQUEST_CREATED",
    resource: "privacy_request",
    resourceId: request.id,
    details: { type },
  });

  res.status(201).json({
    request,
    message: "Solicitação registrada. A equipe responsável deverá analisar e responder conforme a legislação aplicável.",
  });
}

async function exportData(req, res) {
  const userId = req.user.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, email: true, phone: true, avatarUrl: true,
      role: true, isActive: true, createdAt: true, updatedAt: true, lastLogin: true,
      addresses: true,
      consents: true,
      privacyRequests: true,
      orders: {
        select: {
          id: true, storeId: true, addressId: true, deliveryAddress: true,
          status: true, paymentMethod: true, subtotal: true, deliveryFee: true,
          total: true, notes: true, estimatedDeliveryAt: true, deliveredAt: true,
          createdAt: true, updatedAt: true, paymentStatus: true,
          items: { select: { id: true, productId: true, productName: true, productPrice: true, quantity: true, total: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      reviews: {
        select: { id: true, orderId: true, storeId: true, rating: true, comment: true, createdAt: true },
      },
    },
  });
  if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

  // Nunca exportamos passwordHash, refresh tokens, access tokens, chaves de pagamento ou segredos.
  await audit(req, { action: "PRIVACY_EXPORT", resource: "user", resourceId: userId });

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="petdelivery-meus-dados-${userId}.json"`);
  res.json({
    exportedAt: new Date().toISOString(),
    formatVersion: "1.0",
    service: "PetDeliveryCE",
    data: user,
  });
}

async function adminListRequests(req, res) {
  const requests = await prisma.privacyRequest.findMany({
    include: { user: { select: { id: true, name: true, email: true, phone: true, role: true } } },
    orderBy: { requestedAt: "desc" },
    take: 200,
  });
  res.json(requests);
}

async function adminUpdateRequest(req, res) {
  const { status, responseNote } = req.body;
  const allowed = ["pending", "in_progress", "completed", "rejected"];
  if (!allowed.includes(status)) return res.status(400).json({ error: "Status inválido" });

  const current = await prisma.privacyRequest.findUnique({ where: { id: req.params.id } });
  if (!current) return res.status(404).json({ error: "Solicitação não encontrada" });

  // A exclusão é deliberada: ao concluir a solicitação, anonimizamos o usuário
  // e removemos dados que não precisam permanecer identificáveis. Pedidos/obrigações
  // que precisem ser mantidos permanecem sem expor o identificador original.
  if (current.type === "deletion" && status === "completed") {
    const anonymizedEmail = `anon-${current.userId}@privacy.invalid`;
    await prisma.$transaction([
      prisma.user.update({
        where: { id: current.userId },
        data: {
          name: "Usuário anonimizado",
          email: anonymizedEmail,
          phone: null,
          avatarUrl: null,
          isActive: false,
          lastLogin: null,
        },
      }),
      prisma.address.deleteMany({ where: { userId: current.userId } }),
      prisma.refreshToken.deleteMany({ where: { userId: current.userId } }),
    ]);
  }

  const request = await prisma.privacyRequest.update({
    where: { id: current.id },
    data: {
      status,
      responseNote: typeof responseNote === "string" ? responseNote.trim().slice(0, 4000) : undefined,
      completedAt: ["completed", "rejected"].includes(status) ? new Date() : null,
    },
  });

  await audit(req, {
    action: current.type === "deletion" && status === "completed"
      ? "PRIVACY_DELETION_COMPLETED"
      : "PRIVACY_REQUEST_UPDATED",
    resource: "privacy_request",
    resourceId: request.id,
    details: { status, type: current.type },
  });

  res.json(request);
}

async function createIncident(req, res) {
  const { title, description, severity = "medium" } = req.body;
  if (!title?.trim() || !description?.trim()) return res.status(400).json({ error: "Título e descrição são obrigatórios" });
  if (!["low", "medium", "high", "critical"].includes(severity)) return res.status(400).json({ error: "Severidade inválida" });

  const incident = await prisma.securityIncident.create({
    data: { title: title.trim().slice(0, 200), description: description.trim().slice(0, 10000), severity, reporterId: req.user.id },
  });
  await audit(req, { action: "SECURITY_INCIDENT_CREATED", resource: "security_incident", resourceId: incident.id, details: { severity } });
  res.status(201).json(incident);
}

async function listIncidents(req, res) {
  const incidents = await prisma.securityIncident.findMany({
    include: { reporter: { select: { id: true, name: true, email: true } } },
    orderBy: { detectedAt: "desc" }, take: 200,
  });
  res.json(incidents);
}

async function updateIncident(req, res) {
  const { status, containment, resolution } = req.body;
  if (!["open", "investigating", "contained", "resolved", "closed"].includes(status)) return res.status(400).json({ error: "Status inválido" });
  const incident = await prisma.securityIncident.update({
    where: { id: req.params.id },
    data: {
      status,
      containment: typeof containment === "string" ? containment.slice(0, 10000) : undefined,
      resolution: typeof resolution === "string" ? resolution.slice(0, 10000) : undefined,
      resolvedAt: ["resolved", "closed"].includes(status) ? new Date() : null,
    },
  });
  await audit(req, { action: "SECURITY_INCIDENT_UPDATED", resource: "security_incident", resourceId: incident.id, details: { status } });
  res.json(incident);
}

async function listAuditLogs(req, res) {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" }, take: 300,
    select: {
      id: true, userId: true, action: true, resource: true, resourceId: true,
      ipAddress: true, userAgent: true, details: true, createdAt: true,
      user: { select: { name: true, email: true, role: true } },
    },
  });
  res.json(logs);
}

module.exports = {
  getMyData, getConsents, updateConsent, requestPrivacyAction, exportData,
  adminListRequests, adminUpdateRequest, createIncident, listIncidents, updateIncident, listAuditLogs,
};
