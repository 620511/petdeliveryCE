// backend/src/middleware/errorHandler.js
// FIX: adicionados códigos de erro do Prisma

const { Prisma } = require("@prisma/client");

const errorHandler = (err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}`, err.message);

  // ── Erros do Prisma ────────────────────────────────────────────
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      // Unique constraint
      const field = err.meta?.target?.[0] || "campo";
      return res.status(409).json({ error: `${field} já está em uso` });
    }
    if (err.code === "P2025") {
      // Record not found
      return res.status(404).json({ error: "Registro não encontrado" });
    }
    if (err.code === "P2003") {
      // Foreign key constraint
      return res.status(400).json({ error: "Referência inválida" });
    }
    return res.status(400).json({ error: "Erro de banco de dados", code: err.code });
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({ error: "Dados inválidos para o banco de dados" });
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    console.error("❌ Prisma não conseguiu conectar ao banco:", err.message);
    return res.status(503).json({ error: "Banco de dados indisponível" });
  }

  // ── Erros de negócio com statusCode ───────────────────────────
  if (err.statusCode) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // ── Erros genéricos ────────────────────────────────────────────
  const status = err.status || 500;
  const message = status < 500 ? err.message : "Erro interno do servidor";
  res.status(status).json({ error: message });
};

// Wrapper async — elimina try/catch repetitivo nos controllers
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { errorHandler, asyncHandler };
