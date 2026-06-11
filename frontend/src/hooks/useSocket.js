// frontend/src/hooks/useSocket.js
// Hook para Socket.io — conecta com auth, gerencia lifecycle

import { useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";

/**
 * Hook que cria e gerencia uma conexão Socket.io autenticada.
 *
 * @param {object} options
 * @param {boolean} options.enabled  - Só conecta se true (ex: quando usuário está logado)
 * @param {Function} options.onConnect    - Callback ao conectar
 * @param {Function} options.onDisconnect - Callback ao desconectar
 *
 * @returns {{ socket, joinRoom, leaveRoom, on, off, emit }}
 */
export function useSocket({ enabled = true, onConnect, onDisconnect } = {}) {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("🔌 Socket conectado:", socket.id);
      onConnect?.(socket);
    });

    socket.on("disconnect", (reason) => {
      console.log("🔌 Socket desconectado:", reason);
      onDisconnect?.(reason);
    });

    socket.on("connect_error", (err) => {
      console.warn("🔌 Erro de conexão Socket:", err.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled]);

  const joinRoom  = useCallback((room) => socketRef.current?.emit("store:join",  room), []);
  const trackOrder = useCallback((orderId) => socketRef.current?.emit("order:track", orderId), []);
  const on        = useCallback((event, cb) => { socketRef.current?.on(event, cb); return () => socketRef.current?.off(event, cb); }, []);
  const off       = useCallback((event, cb) => socketRef.current?.off(event, cb), []);
  const emit      = useCallback((event, data) => socketRef.current?.emit(event, data), []);

  return { socket: socketRef, joinRoom, trackOrder, on, off, emit };
}
