"use client";

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket;
  socket = io("http://localhost:5000", {
    auth: { token },
    transports: ["websocket", "polling"],
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
