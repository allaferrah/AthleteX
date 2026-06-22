const jwt = require("jsonwebtoken");
const { prisma } = require("../lib/prisma");
const CALL_TIMEOUT_MS = 30000;

function initSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No auth token"));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "SECRET_KEY");
      socket.userId = decoded.userId;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.userId;
    socket.join(`user:${userId}`);
    socket.broadcast.emit("user:online", { userId });

    // ─── Video Call Signaling ─────────────────────────────────────────

    socket.on("call:offer", async ({ calleeId, offer }) => {
      try {
        const calleeSockets = await io.to(`user:${calleeId}`).fetchSockets();
        if (calleeSockets.length === 0) {
          try { await prisma.callLog.create({ data: { callerId: userId, calleeId, status: "MISSED" } }); } catch (e) { console.error("DB error (callLog create):", e.message); }
          socket.emit("call:missed", { calleeId });
          return;
        }

        let caller = null;
        try {
          caller = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, profile: { select: { fullName: true, photoUrl: true } } },
          });
        } catch (e) { console.error("DB error (user find):", e.message); }

        let callLog = null;
        try {
          callLog = await prisma.callLog.create({ data: { callerId: userId, calleeId, status: "MISSED" } });
        } catch (e) { console.error("DB error (callLog create):", e.message); }

        io.to(`user:${calleeId}`).emit("call:incoming", {
          from: userId,
          callerName: caller?.profile?.fullName || caller?.email || "Unknown",
          callerPhoto: caller?.profile?.photoUrl || null,
          callLogId: callLog?.id || null,
          offer,
        });

        if (callLog?.id) {
          setTimeout(async () => {
            try {
              const existing = await prisma.callLog.findUnique({ where: { id: callLog.id } });
              if (existing && existing.status === "MISSED") {
                socket.emit("call:timeout", { callLogId: callLog.id });
              }
            } catch (e) { console.error("DB error (callLog check):", e.message); }
          }, CALL_TIMEOUT_MS);
        }
      } catch (e) { console.error("call:offer handler error:", e.message); }
    });

    socket.on("call:accept", async ({ callLogId, calleeId, answer }) => {
      try {
        await prisma.callLog.update({
          where: { id: callLogId },
          data: { status: "COMPLETED", answeredAt: new Date() },
        });
      } catch (e) { console.error("DB error (callLog update):", e.message); }
      io.to(`user:${calleeId}`).emit("call:accepted", { callLogId, answer, from: userId });
    });

    socket.on("call:reject", async ({ callLogId, calleeId }) => {
      try {
        await prisma.callLog.update({
          where: { id: callLogId },
          data: { status: "REJECTED" },
        });
      } catch (e) { console.error("DB error (callLog reject):", e.message); }
      io.to(`user:${calleeId}`).emit("call:rejected", { callLogId });
    });

    socket.on("call:ice-candidate", ({ to, candidate }) => {
      io.to(`user:${to}`).emit("call:ice-candidate", { from: userId, candidate });
    });

    socket.on("call:end", async ({ to, callLogId, duration }) => {
      if (callLogId) {
        try {
          await prisma.callLog.update({
            where: { id: callLogId },
            data: { status: duration ? "COMPLETED" : "CANCELLED", duration: duration || null },
          });
        } catch (e) { console.error("DB error (callLog end):", e.message); }
      }
      io.to(`user:${to}`).emit("call:ended", { from: userId });
    });

    socket.on("disconnect", () => {
      socket.broadcast.emit("user:offline", { userId });
    });
  });
}

module.exports = initSocket;
