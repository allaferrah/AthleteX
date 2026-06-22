"use client";

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "https://athletix-backend.onrender.com";

export function connectSocket(
  token: string,
  onError?: (msg: string) => void,
): Socket {
  if (socket?.connected) return socket;
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
    timeout: 20000,
  });

  socket.on("connect_error", (err) => {
    console.error("🔌 Socket connect_error:", err.message);
    if (err.message === "websocket error") {
      console.log("🔌 WebSocket failed, falling back to polling");
    }
    if (onError) onError(`Connection error: ${err.message}. Make sure the backend is running.`);
  });

  socket.on("connect", () => {
    console.log("🔌 Socket connected:", socket?.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("🔌 Socket disconnected:", reason);
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
