// backend/src/middleware/auth.js
// FIX: migrado de pg para Prisma

const jwt  = require("jsonwebtoken");
const prisma = require("../config/database");

// ── Verifica JWT e carrega req.user ────────────────────────────────
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token não fornecido" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Usuário inativo ou não encontrado" });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expirado", code: "TOKEN_EXPIRED" });
    }
    return res.status(401).json({ error: "Token inválido" });
  }
};

// ── Guard de role ──────────────────────────────────────────────────
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Não autenticado" });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: "Acesso negado" });
  }
  next();
};

const requireAdmin    = requireRole("admin");
const requireStore    = requireRole("store_owner", "admin");
const requireCustomer = requireRole("customer", "admin");

module.exports = { authenticate, requireRole, requireAdmin, requireStore, requireCustomer };
