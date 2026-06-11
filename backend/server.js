// backend/server.js
require("dotenv").config();
const http   = require("http");
const app    = require("./src/app");
const prisma = require("./src/config/database");
const { initSocket } = require("./src/config/socket");

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    await prisma.$connect();
    console.log("✅ PostgreSQL conectado via Prisma");

    // Cria servidor HTTP e inicializa Socket.io
    const httpServer = http.createServer(app);
    initSocket(httpServer);
    console.log("✅ Socket.io inicializado");

    httpServer.listen(PORT, () => {
      console.log(`\n🚀 PetDelivery API rodando em http://localhost:${PORT}`);
      console.log(`   Health:    http://localhost:${PORT}/health`);
      console.log(`   Ambiente:  ${process.env.NODE_ENV || "development"}\n`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\n${signal} recebido. Encerrando...`);
      httpServer.close(async () => {
        await prisma.$disconnect();
        console.log("✅ Conexões encerradas.");
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT",  () => shutdown("SIGINT"));

  } catch (err) {
    console.error("❌ Falha ao iniciar:");
    console.error("  ", err.message);
    console.error("\n  Verifique DATABASE_URL no arquivo .env\n");
    await prisma.$disconnect();
    process.exit(1);
  }
}

start();
