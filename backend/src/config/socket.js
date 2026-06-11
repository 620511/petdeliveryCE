// backend/src/config/socket.js
// Socket.io — tempo real para pedidos

const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

let io = null;

/**
 * Inicializa o servidor Socket.io atrelado ao HTTP server do Express.
 * Chame UMA vez em server.js.
 */
function initSocket(httpServer) {
  const origins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((o) => o.trim());

  io = new Server(httpServer, {
    cors: { origin: origins, credentials: true },
    // Fallback para polling caso WebSocket seja bloqueado
    transports: ["websocket", "polling"],
  });

  // ── Middleware de autenticação ─────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Token não fornecido"));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId   = decoded.userId;
      socket.userRole = decoded.role;
      next();
    } catch {
      next(new Error("Token inválido"));
    }
  });

  // ── Eventos de conexão ─────────────────────────────────────────
  io.on("connection", (socket) => {
    console.log(`🔌 [Socket] ${socket.userRole} conectado: ${socket.userId}`);

    /**
     * Lojista entra na sala da sua loja para receber novos pedidos.
     * Evento: store:join  →  payload: storeId (string)
     */
    socket.on("store:join", (storeId) => {
      if (!storeId) return;
      socket.join(`store:${storeId}`);
      console.log(`   ↳ Lojista entrou em sala: store:${storeId}`);
    });

    /**
     * Cliente acompanha status de um pedido específico.
     * Evento: order:track  →  payload: orderId (string)
     */
    socket.on("order:track", (orderId) => {
      if (!orderId) return;
      socket.join(`order:${orderId}`);
      console.log(`   ↳ Cliente rastreando pedido: order:${orderId}`);
    });

    socket.on("disconnect", (reason) => {
      console.log(`🔌 [Socket] Desconectado: ${socket.userId} (${reason})`);
    });
  });

  return io;
}

/**
 * Retorna a instância do Socket.io.
 * Seguro chamar em qualquer lugar após initSocket().
 */
function getIO() {
  if (!io) {
    console.warn("[Socket] getIO() chamado antes de initSocket() — eventos não serão emitidos");
    return { to: () => ({ emit: () => {} }) }; // no-op seguro
  }
  return io;
}

module.exports = { initSocket, getIO };
