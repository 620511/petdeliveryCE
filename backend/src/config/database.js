// backend/src/config/database.js
// FIX: substituído pool pg por PrismaClient

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development"
    ? ["error", "warn"]
    : ["error"],
});

// Graceful shutdown
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

module.exports = prisma;
