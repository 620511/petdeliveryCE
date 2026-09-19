// backend/src/controllers/auth.controller.js
// FIX: migrado de pg raw para Prisma + validação + timing-safe login

const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const prisma = require("../config/database");
const { audit } = require("../services/audit.service");

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PRIVACY_POLICY_VERSION = process.env.PRIVACY_POLICY_VERSION || "1.0";
const TERMS_VERSION = process.env.TERMS_VERSION || "1.0";

const generateTokens = (user) => {
  const payload = { userId: user.id, role: user.role };
  return {
    accessToken:  jwt.sign(payload, process.env.JWT_SECRET,         { expiresIn: process.env.JWT_EXPIRES_IN         || "15m" }),
    refreshToken: jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d"  }),
  };
};

const saveRefreshToken = (userId, token) =>
  prisma.refreshToken.create({
    data: { userId, token, expiresAt: new Date(Date.now() + REFRESH_TTL_MS) },
  });

// POST /api/auth/register
const register = async (req, res) => {
  const { name, email, password, role = "customer", phone, acceptPrivacy, acceptTerms, marketingConsent = false } = req.body;

  const normalizedEmail = email?.trim().toLowerCase();
  if (!name?.trim() || !normalizedEmail || !password)
    return res.status(400).json({ error: "Nome, e-mail e senha são obrigatórios" });
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail))
    return res.status(400).json({ error: "E-mail inválido" });
  if (password.length < 6)
    return res.status(400).json({ error: "Senha deve ter no mínimo 6 caracteres" });
  if (acceptPrivacy !== true || acceptTerms !== true)
    return res.status(400).json({ error: "É necessário aceitar a Política de Privacidade e os Termos de Uso." });
  if (!["customer", "store_owner"].includes(role))
    return res.status(400).json({ error: "Role inválida" });

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) return res.status(409).json({ error: "E-mail já cadastrado" });

  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();
  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role,
      phone: phone || null,
      consents: {
        create: [
          {
            type: "privacy_policy",
            version: PRIVACY_POLICY_VERSION,
            granted: true,
            grantedAt: now,
            ipAddress: req.ip || null,
            userAgent: req.get("user-agent")?.slice(0, 500) || null,
          },
          {
            type: "terms_of_use",
            version: TERMS_VERSION,
            granted: true,
            grantedAt: now,
            ipAddress: req.ip || null,
            userAgent: req.get("user-agent")?.slice(0, 500) || null,
          },
          ...(marketingConsent === true ? [{
            type: "marketing",
            version: PRIVACY_POLICY_VERSION,
            granted: true,
            grantedAt: now,
            ipAddress: req.ip || null,
            userAgent: req.get("user-agent")?.slice(0, 500) || null,
          }] : []),
        ],
      },
    },
    select: { id: true, name: true, email: true, role: true },
  });

  await audit(req, {
    action: "AUTH_REGISTER",
    resource: "user",
    resourceId: user.id,
    details: { role: user.role, privacyVersion: PRIVACY_POLICY_VERSION, termsVersion: TERMS_VERSION },
  });

  const tokens = generateTokens(user);
  await saveRefreshToken(user.id, tokens.refreshToken);
  res.status(201).json({ user, ...tokens });
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        error: "E-mail e senha são obrigatórios"
      });
    }

    console.log("1 - Recebeu requisição");

    const user = await prisma.user.findUnique({
      where: {
        email: email.toLowerCase()
      }
    });

    console.log("2 - Usuário encontrado:", !!user);

    const dummy =
      "$2a$12$0f6w8gL9G5P3VYl7Fv7Rze5B7n1hQ8aXxjN8v8jK2J5rP0vV4m8kS";

    const valid = user
      ? await bcrypt.compare(password, user.passwordHash)
      : await bcrypt.compare(password, dummy);

    console.log("3 - Senha validada");

    console.log("DEBUG LOGIN:", {
  userFound: !!user,
  valid,
  isActive: user?.isActive,
  role: user?.role
});


    if (!user || !valid) {
      return res.status(401).json({
        error: "Credenciais inválidas"
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: "Conta desativada"
      });
    }

    console.log("4 - Atualizando login");

    await Promise.all([
      prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      }),
      prisma.refreshToken.deleteMany({
        where: {
          userId: user.id,
          expiresAt: {
            lt: new Date()
          }
        }
      })
    ]);

    console.log("5 - Gerando tokens");

    const tokens = generateTokens(user);

    await saveRefreshToken(user.id, tokens.refreshToken);

    const { passwordHash, ...safeUser } = user;

    console.log("6 - Login concluído");

    await audit(req, { action: "AUTH_LOGIN_SUCCESS", resource: "user", resourceId: user.id });
    return res.json({
      user: safeUser,
      ...tokens
    });

  } catch (err) {
    console.error("🔥 LOGIN ERROR:", err);

    return res.status(500).json({
      error: err.message
    });
  }
};

// POST /api/auth/refresh
const refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: "Refresh token obrigatório" });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const stored = await prisma.refreshToken.findFirst({
      where: { token: refreshToken, userId: decoded.userId, expiresAt: { gt: new Date() } },
    });
    if (!stored) return res.status(401).json({ error: "Refresh token inválido ou expirado" });

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, isActive: true },
    });
    if (!user?.isActive) return res.status(401).json({ error: "Usuário inativo" });

    const tokens = generateTokens(user);
    await prisma.refreshToken.delete({ where: { id: stored.id } });
    await saveRefreshToken(user.id, tokens.refreshToken);
    res.json(tokens);
  } catch {
    return res.status(401).json({ error: "Refresh token inválido" });
  }
};

// POST /api/auth/logout
const logout = async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  if (req.user?.id) await audit(req, { action: "AUTH_LOGOUT", resource: "user", resourceId: req.user.id });
  res.json({ message: "Logout realizado" });
};

// GET /api/auth/me
const me = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, name: true, email: true, role: true, phone: true, avatarUrl: true, createdAt: true },
  });
  if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
  res.json(user);
};

// PUT /api/auth/change-password
// Funciona para qualquer tipo de conta (admin, lojista, cliente) — usa o usuário autenticado
const changePassword = async (req, res) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password)
    return res.status(400).json({ error: "Senha atual e nova senha são obrigatórias" });
  if (new_password.length < 6)
    return res.status(400).json({ error: "A nova senha deve ter no mínimo 6 caracteres" });

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

  const valid = await bcrypt.compare(current_password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Senha atual incorreta" });

  const passwordHash = await bcrypt.hash(new_password, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  // Invalida todas as sessões antigas por segurança — obriga a logar de novo com a senha nova
  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
  await audit(req, { action: "AUTH_PASSWORD_CHANGED", resource: "user", resourceId: user.id });

  res.json({ message: "Senha alterada com sucesso" });
};

module.exports = { register, login, refresh, logout, me, changePassword };
