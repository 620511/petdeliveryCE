// Auditoria e controles LGPD/seguranca.
// Nao registre senhas, tokens, chaves, dados de cartao ou dados pessoais desnecessarios.
const prisma = require("../config/database");

const clientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  return (typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.ip) || null;
};

async function audit(req, { action, resource = null, resourceId = null, details = null, userId = undefined }) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId === undefined ? (req.user?.id || null) : userId,
        action,
        resource,
        resourceId,
        ipAddress: clientIp(req),
        userAgent: req.get("user-agent")?.slice(0, 500) || null,
        details,
      },
    });
  } catch (err) {
    // Auditoria nunca deve derrubar a operacao principal.
    console.error("Falha ao gravar auditoria:", err.message);
  }
}

module.exports = { audit, clientIp };
