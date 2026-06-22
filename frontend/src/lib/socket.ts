"use client";

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export function connectSocket(
  token: string,
  onError?: (msg: string) => void,
): Socket {
  if (socket?.connected) return socket;
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket"],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 10000,
  });

  socket.on("connect_error", (err) => {
    console.error("🔌 Socket connect_error:", err.message);
    if (onError) onError(`Connection error: ${err.message}. Check that the backend is running.`);
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
