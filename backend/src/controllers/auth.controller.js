// backend/src/controllers/auth.controller.js
// FIX: migrado de pg raw para Prisma + validação + timing-safe login

const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const prisma = require("../config/database");

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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
  const { name, email, password, role = "customer", phone } = req.body;

  if (!name?.trim() || !email?.trim() || !password)
    return res.status(400).json({ error: "Nome, e-mail e senha são obrigatórios" });
  if (password.length < 6)
    return res.status(400).json({ error: "Senha deve ter no mínimo 6 caracteres" });
  if (!["customer", "store_owner"].includes(role))
    return res.status(400).json({ error: "Role inválida" });

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return res.status(409).json({ error: "E-mail já cadastrado" });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name: name.trim(), email: email.toLowerCase(), passwordHash, role, phone: phone || null },
    select: { id: true, name: true, email: true, role: true },
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

module.exports = { register, login, refresh, logout, me };
