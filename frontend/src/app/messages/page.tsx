"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { messageAPI, profileAPI, uploadAPI, orderAPI, paymentAPI, reviewAPI, reportAPI } from "@/lib/api";
import { getUser, isLoggedIn, getToken } from "@/lib/auth";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/i18n/LocaleContext";
import { fDZD } from "@/lib/format";
import { StarIcon } from "@/components/StarIcon";
import Image from "next/image";
import { connectSocket, getSocket, disconnectSocket } from "@/lib/socket";
import {
  createPeerConnection, startLocalStream, stopLocalStream,
  createOffer, createAnswer, setRemoteDescription, addIceCandidate,
  fetchTurnCredentials, waitForDeviceRelease, cleanupAudioSink,
  ensureAudioSink, addLocalTracks, attemptIceRestart, resetIceRestartAttempts,
} from "@/lib/webrtc";
import type { CreatePcCallbacks } from "@/lib/webrtc";
import { useCallSound } from "@/lib/useCallSound";
import { normalizeUrl } from "@/lib/url";
import { useInCall } from "@/contexts/CallContext";
import VideoCallOverlay from "@/components/video-call/VideoCallOverlay";
import IncomingCallModal from "@/components/video-call/IncomingCallModal";

interface Conversation {
  partnerId: string; partnerEmail: string; partnerRole: string;
  lastMessage: string; lastMessageAt: string; unreadCount: number;
}

interface ChatMessage {
  id: string; senderId: string; content: string;
  imageUrl: string | null; createdAt: string;
  sender: { id: string; email: string };
}

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const [user, setUser] = useState<{ id: string; email: string; role: string } | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [selectedPartnerEmail, setSelectedPartnerEmail] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [partnerPhoto, setPartnerPhoto] = useState<string | null>(null);
  const [autoSelectAttempted, setAutoSelectAttempted] = useState(false);
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [missedCalls, setMissedCalls] = useState<Set<string>>(new Set());

  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [currentOrder, setCurrentOrder] = useState<any | null>(null);
  const [payActionLoading, setPayActionLoading] = useState(false);
  const [payActionMsg, setPayActionMsg] = useState("");

  const [reviewModal, setReviewModal] = useState<{ orderId: string; serviceTitle: string; expertId: string; expertName: string } | null>(null);
  const [modalView, setModalView] = useState<"rate" | "report" | "done">("rate");
  const [modalRating, setModalRating] = useState(0);
  const [modalHover, setModalHover] = useState(0);
  const [modalComment, setModalComment] = useState("");
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalReportReason, setModalReportReason] = useState("");
  const [modalReportDesc, setModalReportDesc] = useState("");
  const [modalReportSubmitting, setModalReportSubmitting] = useState(false);
  const [modalReportMsg, setModalReportMsg] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const convRef = useRef<Conversation[]>([]);
  const msgCountRef = useRef(0);

  // ─── Video Call State ───────────────────────────────────────────────
  const [callState, setCallState] = useState<"idle" | "calling" | "connected" | "ended">("idle");
  const [incomingCall, setIncomingCall] = useState<{ from: string; callerName: string; callerPhoto: string | null; callLogId: string; offer?: any } | null>(null);
  const [callPartner, setCallPartner] = useState<{ id: string; name: string; photo: string | null } | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [callMuted, setCallMuted] = useState(false);
  const [callCameraOn, setCallCameraOn] = useState(true);
  const [callLogId, setCallLogId] = useState<string | null>(null);
  const [callError, setCallError] = useState<string | null>(null);
  const [socketError, setSocketError] = useState<string | null>(null);
  const [iceConnState, setIceConnState] = useState<string>("new");
  const { playRingtone, stopRingtone } = useCallSound();
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const durationRef = useRef<NodeJS.Timeout | null>(null);
  const isCallActiveRef = useRef(false);
  const callStateRef = useRef(callState);
  useEffect(() => { callStateRef.current = callState; }, [callState]);
  const { setInCall } = useInCall();
  useEffect(() => { setInCall(callState === "connected"); }, [callState, setInCall]);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  const flushPendingCandidates = useCallback(async () => {
    const pc = peerRef.current;
    if (!pc || !pc.remoteDescription || pendingCandidatesRef.current.length === 0) return;
    const batch = pendingCandidatesRef.current;
    pendingCandidatesRef.current = [];
    for (const c of batch) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
    }
  }, []);

  const cleanupCall = useCallback(() => {
    if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
    if (localStreamRef.current) { stopLocalStream(localStreamRef.current); localStreamRef.current = null; }
    if (durationRef.current) { clearInterval(durationRef.current); durationRef.current = null; }
    cleanupAudioSink();
    isCallActiveRef.current = false;
    setLocalStream(null); setRemoteStream(null); setCallDuration(0);
    setIncomingCall(null); setCallLogId(null); setCallError(null); setIceConnState("new");
    setCallPartner(null);
    waitForDeviceRelease();
  }, []);

  // ─── Socket Setup ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn()) return;
    const token = getToken();
    if (!token) return;
    setSocketError(null);
    const socket = connectSocket(token, (msg) => setSocketError(msg));

    socket.on("user:online", ({ userId: id }: { userId: string }) => {
      if (id === selectedPartner) setPartnerOnline(true);
    });
    socket.on("user:offline", ({ userId: id }: { userId: string }) => {
      if (id === selectedPartner) setPartnerOnline(false);
    });

    socket.on("call:incoming", async (data: { from: string; callerName: string; callerPhoto: string | null; callLogId: string; offer: any }) => {
      const pc = peerRef.current;
      if (pc && callStateRef.current === "connected") {
        if (data.offer) {
          try {
            await setRemoteDescription(pc, data.offer);
            await flushPendingCandidates();
            const answer = await createAnswer(pc);
            const socket = getSocket();
            if (socket) socket.emit("call:accept", { callLogId: data.callLogId, calleeId: data.from, answer });
          } catch (err) {
            console.error("ICE restart offer handling failed:", err);
          }
        }
        return;
      }
      setIncomingCall(data);
      playRingtone();
    });

    socket.on("call:accepted", async ({ callLogId: id, answer, from }: { callLogId: string; answer: any; from: string }) => {
      stopRingtone();
      setCallLogId(id); setCallState("connected");
      const pc = peerRef.current;
      if (pc && answer) {
        try { await setRemoteDescription(pc, answer); } catch {}
        await flushPendingCandidates();
      }
    });

    socket.on("call:rejected", () => { stopRingtone(); cleanupCall(); setCallState("idle"); });
    socket.on("call:timeout", () => {
      stopRingtone();
      if (selectedPartner) setMissedCalls((prev) => new Set(prev).add(selectedPartner));
      cleanupCall(); setCallState("idle");
    });
    socket.on("call:missed", () => {
      stopRingtone();
      if (selectedPartner) setMissedCalls((prev) => new Set(prev).add(selectedPartner));
      cleanupCall(); setCallState("idle");
    });

    socket.on("call:ice-candidate", async ({ from: _, candidate }: { from: string; candidate: any }) => {
      const pc = peerRef.current;
      if (!pc || !candidate) return;
      if (pc.remoteDescription) {
        try { await addIceCandidate(pc, candidate); } catch {}
      } else {
        pendingCandidatesRef.current.push(candidate);
      }
    });

    socket.on("call:ended", () => {
      stopRingtone();
      cleanupCall(); setCallState("ended");
      setTimeout(() => setCallState("idle"), 2500);
    });

    return () => {
      socket.off("user:online"); socket.off("user:offline");
      socket.off("call:incoming"); socket.off("call:accepted");
      socket.off("call:rejected"); socket.off("call:timeout");
      socket.off("call:missed"); socket.off("call:ice-candidate");
      socket.off("call:ended");
    };
  }, [selectedPartner]);

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    setUser(getUser());
    loadConversations();
    loadOrders();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      disconnectSocket();
      cleanupCall();
    };
  }, []);

  useEffect(() => {
    if (messages.length > msgCountRef.current) {
      const container = messagesContainerRef.current;
      if (container) container.scrollTop = container.scrollHeight;
    }
    msgCountRef.current = messages.length;
  }, [messages]);

  useEffect(() => {
    if (autoSelectAttempted) return;
    const expertId = searchParams.get("expertId");
    if (!expertId) { setAutoSelectAttempted(true); return; }
    const found = convRef.current.find((c) => c.partnerId === expertId);
    if (found) {
      selectConversation(found.partnerId, found.partnerEmail);
      setAutoSelectAttempted(true);
    } else if (convRef.current.length > 0) {
      setAutoSelectAttempted(true);
    }
  }, [conversations, searchParams]);

  const loadConversations = async () => {
    try { const data = await messageAPI.getConversations(); setConversations(data); convRef.current = data; } catch {}
    setLoadingConvos(false);
  };

  const selectConversation = async (partnerId: string, partnerEmail: string) => {
    setSelectedPartner(partnerId); setSelectedPartnerEmail(partnerEmail); setLoadingMsgs(true);
    setPartnerPhoto(null); setPayActionMsg(""); setCurrentOrder(null); setPartnerOnline(false);
    if (pollRef.current) clearInterval(pollRef.current);

    const order = myOrders.find((o: any) => o.service?.expert?.id === partnerId || o.service?.expertId === partnerId);
    setCurrentOrder(order || null);

    try {
      const data = await messageAPI.getMessages(partnerId);
      setMessages(data);
    } catch {}
    try {
      const p = await profileAPI.getExpertProfile(partnerId);
      if (p?.photoUrl) setPartnerPhoto(p.photoUrl);
    } catch {}
    setLoadingMsgs(false);
    pollRef.current = setInterval(async () => {
      try { const data = await messageAPI.getMessages(partnerId); setMessages(data); } catch {}
    }, 3000);
  };

  // ─── Video Call Actions ─────────────────────────────────────────────

  const handleStartCall = async () => {
    if (!selectedPartner || isCallActiveRef.current) return;
    isCallActiveRef.current = true;
    setCallError(null);
    resetIceRestartAttempts();
    ensureAudioSink();
    try {
      await fetchTurnCredentials();
      await waitForDeviceRelease();
      const stream = await startLocalStream();
      localStreamRef.current = stream;
      setLocalStream(stream);
      setCallState("calling");
      setCallPartner({
        id: selectedPartner,
        name: selectedPartnerEmail,
        photo: partnerPhoto,
      });

      const cb: CreatePcCallbacks = {
        onRemoteStream: (remote) => { setRemoteStream(remote); },
        onIceCandidate: (candidate) => {
          const socket = getSocket();
          if (socket) socket.emit("call:ice-candidate", { to: selectedPartner, candidate });
        },
        onIceFailed: () => {
          setCallError("Connection lost. Check your network and try a different connection.");
          cleanupCall(); setCallState("idle");
        },
        onIceStateChange: (state) => setIceConnState(state),
        onDisconnected: async () => {
          const pc = peerRef.current;
          if (!pc) return;
          const newOffer = await attemptIceRestart(pc);
          if (newOffer) {
            const socket = getSocket();
            if (socket) socket.emit("call:offer", { calleeId: selectedPartner, offer: newOffer });
          } else {
            setCallError("Connection lost. Check your network and try a different connection.");
            cleanupCall(); setCallState("idle");
          }
        },
      };
      const pc = createPeerConnection(cb);
      peerRef.current = pc;

      addLocalTracks(pc, stream);
      const offer = await createOffer(pc);

      const socket = getSocket();
      if (!socket) { cleanupCall(); return; }
      socket.emit("call:offer", { calleeId: selectedPartner, offer });
      console.log("📞 Call offer sent to", selectedPartner);

      durationRef.current = setInterval(() => {
        setCallDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      console.error("❌ Call start failed:", err);
      setCallError(err instanceof DOMException && err.name === "NotAllowedError"
        ? "Camera/microphone permission denied. Allow access in browser settings."
        : err instanceof DOMException && err.name === "NotFoundError"
        ? "No camera or microphone found. Connect a device and try again."
        : "Failed to start call. Try again.");
      cleanupCall(); setCallState("idle");
    }
  };

  const handleAcceptCall = async () => {
    if (!incomingCall || isCallActiveRef.current) return;
    isCallActiveRef.current = true;
    setCallError(null);
    resetIceRestartAttempts();
    stopRingtone();
    ensureAudioSink();
    try {
      await fetchTurnCredentials();
      await waitForDeviceRelease();
      const stream = await startLocalStream();
      localStreamRef.current = stream;
      setLocalStream(stream);
      setCallState("connected");
      setCallLogId(incomingCall.callLogId);
      setCallPartner({
        id: incomingCall.from,
        name: incomingCall.callerName,
        photo: incomingCall.callerPhoto,
      });

      const cb: CreatePcCallbacks = {
        onRemoteStream: (remote) => { setRemoteStream(remote); },
        onIceCandidate: (candidate) => {
          const socket = getSocket();
          if (socket) socket.emit("call:ice-candidate", { to: incomingCall.from, candidate });
        },
        onIceFailed: () => {
          setCallError("Connection lost. Check your network and try a different connection.");
          cleanupCall(); setCallState("idle");
        },
        onIceStateChange: (state) => setIceConnState(state),
        onDisconnected: async () => {
          const pc = peerRef.current;
          if (!pc) return;
          const newOffer = await attemptIceRestart(pc);
          if (newOffer) {
            const socket = getSocket();
            if (socket) socket.emit("call:offer", { calleeId: incomingCall.from, offer: newOffer });
          } else {
            setCallError("Connection lost. Check your network and try a different connection.");
            cleanupCall(); setCallState("idle");
          }
        },
      };
      const pc = createPeerConnection(cb);
      peerRef.current = pc;

      addLocalTracks(pc, stream);

      if (incomingCall.offer) {
        await setRemoteDescription(pc, incomingCall.offer);
        await flushPendingCandidates();
        const answer = await createAnswer(pc);
        console.log("📞 Call answer created for", incomingCall.from);

        const socket = getSocket();
        if (socket) {
          socket.emit("call:accept", { callLogId: incomingCall.callLogId, calleeId: incomingCall.from, answer });
        }
      }

      setIncomingCall(null);
      durationRef.current = setInterval(() => { setCallDuration((d) => d + 1); }, 1000);
    } catch (err) {
      console.error("❌ Call accept failed:", err);
      setCallError(err instanceof DOMException && err.name === "NotAllowedError"
        ? "Camera/microphone permission denied. Allow access in browser settings."
        : err instanceof DOMException && err.name === "NotFoundError"
        ? "No camera or microphone found. Connect a device and try again."
        : "Failed to answer call. Try again.");
      cleanupCall(); setCallState("idle");
    }
  };

  const handleRejectCall = () => {
    if (!incomingCall) return;
    stopRingtone();
    const socket = getSocket();
    if (socket) socket.emit("call:reject", { callLogId: incomingCall.callLogId, calleeId: incomingCall.from });
    setIncomingCall(null);
  };

  const handleEndCall = () => {
    const socket = getSocket();
    const partnerId = callPartner?.id || selectedPartner;
    if (socket && partnerId && callState === "connected") {
      socket.emit("call:end", { to: partnerId, callLogId, duration: callDuration });
    }
    if (incomingCall) {
      const socket = getSocket();
      if (socket) socket.emit("call:reject", { callLogId: incomingCall.callLogId, calleeId: incomingCall.from });
      setIncomingCall(null);
    }
    cleanupCall();
    setCallState("idle");
  };

  const loadOrders = async () => {
    try { const data = await orderAPI.getMyOrders(); setMyOrders(data); } catch {}
  };

  const handlePayAction = async (action: "pay" | "release") => {
    if (!currentOrder) return;
    setPayActionLoading(true); setPayActionMsg("");
    try {
      if (action === "pay") {
        await paymentAPI.payOrder(currentOrder.id);
        setPayActionMsg("Payment held successfully! The expert will receive it when you confirm delivery.");
      } else {
        await paymentAPI.confirmRelease(currentOrder.id);
        setPayActionMsg("Payment released! The funds have been sent to the expert.");
        setReviewModal({ orderId: currentOrder.id, serviceTitle: currentOrder.service?.title || "Service", expertId: selectedPartner || "", expertName: selectedPartnerEmail || "Expert" });
        setModalView("rate"); setModalRating(0); setModalComment(""); setModalError("");
        setModalReportReason(""); setModalReportDesc(""); setModalReportMsg("");
      }
      const data = await orderAPI.getMyOrders();
      setMyOrders(data);
      setCurrentOrder(data.find((o: any) => o.id === currentOrder.id) || null);
    } catch (err: unknown) { setPayActionMsg((err as Error).message); }
    setPayActionLoading(false);
  };

  const handleModalReviewSubmit = async () => {
    if (modalRating === 0) return;
    setModalSubmitting(true); setModalError("");
    try { await reviewAPI.createReview(reviewModal!.orderId, modalRating, modalComment); setModalView("done"); } catch (err: unknown) { setModalError((err as Error).message); }
    setModalSubmitting(false);
  };

  const handleModalReportSubmit = async () => {
    if (!modalReportReason) return;
    setModalReportSubmitting(true); setModalReportMsg("");
    try { await reportAPI.createReport(reviewModal!.expertId, modalReportReason, modalReportDesc || undefined); setModalView("done"); } catch (err: unknown) { setModalReportMsg((err as Error).message); }
    setModalReportSubmitting(false);
  };

  const closeModal = () => { setReviewModal(null); setModalView("rate"); };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedPartner) return;
    setSending(true);
    try {
      await messageAPI.sendMessage(selectedPartner, newMessage.trim());
      setNewMessage("");
      const data = await messageAPI.getMessages(selectedPartner);
      setMessages(data); loadConversations();
    } catch {}
    setSending(false);
  };

  return (
    <div className="bg-[#03030f] text-slate-100 relative overflow-x-hidden font-sans select-none selection:bg-purple-500 selection:text-white">
      {/* Cosmic background effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[30%] sm:w-[50%] h-[30%] sm:h-[50%] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] sm:w-[50%] h-[30%] sm:h-[50%] rounded-full bg-purple-900/10 blur-[120px] pointer-events-none" />

      {/* ─── Video Call Overlay ──────────────────────────────────────── */}
      {socketError && (
        <div className="fixed top-0 left-0 right-0 z-[200] bg-rose-600/90 text-white px-4 py-3 text-sm text-center font-bold tracking-wider uppercase border-b border-rose-400 shadow-[0_4px_30px_rgba(244,63,94,0.3)] backdrop-blur-md">
          ⚠️ {socketError}
        </div>
      )}
      {callError && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[110] bg-rose-950/80 border-2 border-rose-500 text-rose-300 px-6 py-4 rounded-2xl text-xs font-semibold animate-bounce shadow-[0_0_25px_rgba(244,63,94,0.4)] backdrop-blur-md max-w-md text-center">
          ⚡ {callError}
        </div>
      )}
      {localStream && callState === "connected" && (
        <VideoCallOverlay
          localStream={localStream}
          remoteStream={remoteStream}
          partnerName={callPartner ? callPartner.name : ""}
          partnerPhoto={callPartner ? normalizeUrl(callPartner.photo) : null}
          duration={callDuration}
          muted={callMuted}
          cameraOn={callCameraOn}
          iceState={iceConnState}
          onToggleMute={() => {
            setCallMuted((prev) => {
              const next = !prev;
              if (localStreamRef.current)
                localStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = !next; });
              return next;
            });
          }}
          onToggleCamera={() => {
            setCallCameraOn((prev) => {
              const next = !prev;
              if (localStreamRef.current)
                localStreamRef.current.getVideoTracks().forEach((t) => { t.enabled = next; });
              return next;
            });
          }}
          onEndCall={handleEndCall}
        />
      )}

      {callState === "calling" && (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center border-4 border-cyan-500/10">
          <div className="text-center relative">
            <div className="w-28 h-28 rounded-full bg-cyan-950/50 mx-auto mb-6 flex items-center justify-center text-4xl border-2 border-cyan-500 shadow-[0_0_40px_rgba(6,182,212,0.4)] animate-pulse relative">
              <span className="relative z-10">📡</span>
              <div className="absolute inset-0 rounded-full border border-cyan-400 animate-ping opacity-60" />
            </div>
            <p className="text-cyan-400 text-2xl font-black tracking-widest uppercase mb-1">{t("call.calling")}</p>
            <p className="text-purple-300 text-sm font-mono bg-purple-950/40 py-1 px-3 rounded-full border border-purple-500/20 inline-block mt-1">{selectedPartnerEmail}</p>
            <div className="mt-8">
              <button onClick={handleEndCall} className="py-3 px-8 rounded-full font-bold uppercase tracking-wider text-sm bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)] transition-all duration-300 hover:scale-105 active:scale-95">
                {t("call.endCall")}
              </button>
            </div>
          </div>
        </div>
      )}

      {callState === "ended" && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center pointer-events-none">
          <div className="text-center animate-scale-up">
            <div className="text-6xl mb-4 filter drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]">🛑</div>
            <p className="text-rose-400 text-xl font-bold tracking-widest uppercase">{t("call.callEnded")}</p>
            {callDuration > 0 && (
              <p className="text-purple-300/60 font-mono text-sm mt-2">
                {Math.floor(callDuration / 60)}:{String(callDuration % 60).padStart(2, "0")}
              </p>
            )}
          </div>
        </div>
      )}

      {incomingCall && (
        <IncomingCallModal
          callerName={incomingCall.callerName}
          callerPhoto={normalizeUrl(incomingCall.callerPhoto)}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}

      {/* ─── Page ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-6 animate-fade-in px-4 pt-4">
        <Link href="/" className="text-xs tracking-wider uppercase font-bold text-slate-500 hover:text-cyan-400 transition-all">{t("nav.home")}</Link>
        <span className="text-purple-500/50">/</span>
        <span className="text-xs tracking-wider uppercase font-bold text-purple-400 bg-purple-950/40 border border-purple-500/20 py-1 px-3 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.1)]">{t("nav.messages")}</span>
      </div>

      <div className="mx-2 sm:mx-4 border border-purple-500/10 rounded-2xl bg-slate-950/60 backdrop-blur-xl overflow-x-hidden shadow-[0_0_50px_rgba(139,92,246,0.05)]" style={{ height: "calc(100dvh - 220px)" }}>
        <div className="flex h-full">
          {/* Conversation List */}
          <div className={`${selectedPartner ? "hidden lg:flex" : "flex"} w-full lg:w-80 border-r border-purple-500/10 flex-col flex-shrink-0 bg-slate-950/40`}>
            <div className="p-5 border-b border-purple-500/10 flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-widest font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 flex items-center gap-2">
                <span>🛰️</span> {t("chat.conversations")}
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loadingConvos ? (
                <div className="p-4 space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-16 rounded-xl bg-purple-950/10 border border-purple-500/5 animate-pulse" />
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-5xl mb-4 filter drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]">🪐</div>
                  <p className="text-slate-400 text-xs font-bold tracking-wide">{t("chat.noConversations")}</p>
                  <p className="text-slate-500 text-[10px] mt-2 leading-relaxed">{t("chat.noConversationsDesc")}</p>
                  <Link href="/marketplace" className="mt-6 py-2 px-4 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-purple-600 to-cyan-500 text-white hover:opacity-90 inline-block shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                    {t("dashboard.browseServices")}
                  </Link>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button key={conv.partnerId} onClick={() => selectConversation(conv.partnerId, conv.partnerEmail)}
                    className={`w-full p-4 text-left transition-all duration-300 border-b border-purple-500/5 flex items-center gap-3 relative ${selectedPartner === conv.partnerId ? "bg-gradient-to-r from-purple-950/30 to-cyan-950/10 border-l-4 border-l-cyan-400 shadow-[inset_0_0_15px_rgba(6,182,212,0.05)]" : "hover:bg-purple-950/10"}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 via-indigo-600 to-cyan-500 p-[1px] flex-shrink-0 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
                      <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center text-xs font-black text-cyan-400">
                        {conv.partnerEmail[0].toUpperCase()}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-100 truncate">{conv.partnerEmail}</span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {missedCalls.has(conv.partnerId) && (
                            <span className="text-xs text-rose-500 animate-pulse" title={t("call.missedCallLabel")}>
                              ⚠️
                            </span>
                          )}
                          {conv.unreadCount > 0 && (
                            <span className="h-4 px-1.5 rounded-full bg-cyan-400 text-[9px] font-black text-slate-950 animate-bounce">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-1 font-medium">{conv.lastMessage}</p>
                      <p className="text-[9px] text-purple-400/40 font-mono mt-1">{new Date(conv.lastMessageAt).toLocaleDateString()}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className={`${selectedPartner ? "flex" : "hidden lg:flex"} flex-1 flex-col min-w-0 bg-[#060614]/80`}>
            {!selectedPartner ? (
              <div className="flex-1 flex items-center justify-center relative">
                <div className="text-center p-8 z-10">
                  <div className="text-7xl mb-4 animate-bounce filter drop-shadow-[0_0_20px_rgba(6,182,212,0.3)]">🛰️</div>
                  <h3 className="text-sm uppercase tracking-widest font-black text-slate-300">{t("chat.yourMessages")}</h3>
                  <p className="text-slate-500 text-xs mt-2">{t("chat.selectConversation")}</p>
                </div>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="px-5 py-4 border-b border-purple-500/10 flex items-center gap-3 bg-slate-950/50">
                  <button onClick={() => setSelectedPartner(null)} className="lg:hidden text-purple-400 hover:text-cyan-400 transition-colors mr-1">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  {partnerPhoto ? (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 p-[1px] flex-shrink-0">
                      <Image src={normalizeUrl(partnerPhoto) || ""} alt="" width={36} height={36} className="w-full h-full rounded-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-cyan-500 p-[1px] flex-shrink-0">
                      <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center text-xs font-black text-cyan-400">
                        {selectedPartnerEmail[0].toUpperCase()}
                      </div>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-100 truncate">{selectedPartnerEmail}</p>
                      {missedCalls.has(selectedPartner) && (
                        <span className="text-[10px] bg-rose-950 border border-rose-500 text-rose-400 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">{t("call.missedCallLabel")} 🕐</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`w-2 h-2 rounded-full ${partnerOnline ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse" : "bg-slate-600"}`} />
                      <p className={`text-[9px] font-bold uppercase tracking-wider ${partnerOnline ? "text-emerald-400" : "text-slate-500"}`}>
                        {partnerOnline ? t("common.online") : t("common.offline")}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleStartCall}
                    disabled={callState !== "idle"}
                    className="p-3 bg-purple-950/50 hover:bg-cyan-950 border border-purple-500/20 hover:border-cyan-400 rounded-full text-cyan-400 transition-all duration-300 disabled:opacity-20 flex-shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                    title={t("call.videoCall")}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="23 7 16 12 23 17 23 7" />
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                    </svg>
                  </button>
                </div>

                {/* Order Payment Banner */}
                {currentOrder && currentOrder.paymentStatus && (
                  <div className={`px-5 py-3 border-b ${currentOrder.paymentStatus === "RELEASED" ? "border-emerald-500/20 bg-emerald-950/20" : currentOrder.paymentStatus === "HELD" ? "border-cyan-500/20 bg-cyan-950/20" : "border-purple-500/10 bg-slate-950/40"}`}>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0">
                        {currentOrder.paymentStatus === "HELD" && <span className="text-base">🔒</span>}
                        {currentOrder.paymentStatus === "RELEASED" && <span className="text-base">✅</span>}
                        {currentOrder.paymentStatus === "PENDING" && <span className="text-base">⏳</span>}
                        {currentOrder.paymentStatus === "REFUNDED" && <span className="text-base">↩️</span>}
                        <span className="text-[11px] text-slate-300 tracking-wide font-medium">
                          {currentOrder.service?.title && <span className="font-bold text-slate-100 uppercase text-xs mr-1">{currentOrder.service.title}</span>}
                          {" — "}
                          {currentOrder.paymentStatus === "PENDING" && t("dashboard.awaitingPaymentAmount", { amount: fDZD(currentOrder.amount || currentOrder.service?.price || 0) })}
                          {currentOrder.paymentStatus === "HELD" && t("dashboard.paymentHeldDesc")}
                          {currentOrder.paymentStatus === "RELEASED" && t("dashboard.paymentReleased")}
                          {currentOrder.paymentStatus === "REFUNDED" && t("dashboard.orderRefunded")}
                        </span>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        {currentOrder.paymentStatus === "PENDING" && (
                          <button onClick={() => handlePayAction("pay")} disabled={payActionLoading}
                            className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:opacity-95 text-slate-950 text-[10px] font-black uppercase tracking-wider py-1.5 px-4 rounded-full transition-all duration-300 disabled:opacity-50 whitespace-nowrap"
                          >
                            {payActionLoading ? "..." : t("dashboard.payNowAmount", { amount: fDZD(currentOrder.amount || currentOrder.service?.price || 0) })}
                          </button>
                        )}
                        {currentOrder.paymentStatus === "HELD" && (
                          <button onClick={() => handlePayAction("release")} disabled={payActionLoading}
                            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 text-slate-950 text-[10px] font-black uppercase tracking-wider py-1.5 px-4 rounded-full transition-all duration-300 disabled:opacity-50 whitespace-nowrap"
                          >
                            {payActionLoading ? "..." : t("dashboard.confirmDelivery")}
                          </button>
                        )}
                      </div>
                    </div>
                    {payActionMsg && (
                      <p className={`text-[10px] mt-2 font-bold uppercase tracking-wider ${payActionMsg.includes("successfully") || payActionMsg.includes("released") ? "text-emerald-400" : "text-rose-400"}`}>
                        {payActionMsg}
                      </p>
                    )}
                  </div>
                )}

                {/* Messages */}
                <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-5 space-y-4 overscroll-contain custom-scrollbar">
                  {loadingMsgs ? (
                    <div className="flex items-center justify-center h-full"><div className="text-purple-400/50 text-xs font-mono tracking-widest uppercase animate-pulse">{t("chat.loadingMessages")}</div></div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="text-5xl mb-3 opacity-30 filter drop-shadow-[0_0_10px_rgba(139,92,246,0.3)]">💬</div>
                        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{t("chat.startChat")}</p>
                      </div>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.senderId === user?.id;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-xs relative ${isMe ? "bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-800 text-white rounded-tr-none shadow-[0_4px_15px_rgba(147,51,234,0.15)] border-t border-purple-400/30" : "bg-slate-900/90 border border-purple-500/10 text-slate-100 rounded-tl-none shadow-[0_4px_15px_rgba(0,0,0,0.3)]"}`}>
                            {msg.content && <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>}
                            {msg.imageUrl && (
                              <div className={`relative overflow-hidden rounded-xl ${msg.content ? "mt-2.5" : ""}`}>
                                <Image src={msg.imageUrl} alt="Shared image" width={0} height={0} sizes="100vw"
                                  className="max-h-64 object-cover w-auto h-auto cursor-pointer border border-purple-500/20 hover:scale-[1.02] transition-transform duration-300"
                                  onClick={() => window.open(msg.imageUrl!, "_blank")}
                                />
                              </div>
                            )}
                            <p className={`text-[8px] font-mono mt-2 text-right ${isMe ? "text-purple-200/50" : "text-purple-400/50"}`}>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-purple-500/10 bg-slate-950/40">
                  {uploadError && (
                    <div className="mb-3 p-3 bg-rose-950/40 border border-rose-500/30 text-rose-400 text-[10px] uppercase tracking-wider font-bold rounded-xl flex items-center gap-2">
                      <span>⚠️</span> {uploadError}
                    </div>
                  )}
                  <div className="flex gap-1.5 sm:gap-2 items-center">
                    <button type="button" onClick={() => document.getElementById("chat-image-input")?.click()} className="p-2 sm:p-3 bg-purple-950/50 hover:bg-purple-900 border border-purple-500/20 text-purple-400 hover:text-cyan-400 rounded-full transition-all duration-300 flex-shrink-0" title={t("chat.sendPhoto")}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <input id="chat-image-input" type="file" accept="image/*" className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploadError(""); setSending(true);
                        try {
                          const res = await uploadAPI.uploadFile(file);
                          await messageAPI.sendMessage(selectedPartner!, "", res.url);
                          const data = await messageAPI.getMessages(selectedPartner!);
                          setMessages(data); loadConversations();
                        } catch (err: any) {
                          setUploadError(err?.message || "Upload failed. Try a smaller photo.");
                        }
                        setSending(false);
                        e.target.value = "";
                      }}
                    />
                    <input id="chat-message" name="chatMessage" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
                      className="bg-slate-900/90 border border-purple-500/20 text-slate-100 text-xs px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl flex-1 min-w-0 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400" placeholder={t("chat.typeMessage")} autoComplete="off"
                    />
                    <button onClick={handleSend} disabled={sending || !newMessage.trim()} className="py-2.5 sm:py-3 px-3 sm:px-6 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 text-white font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:opacity-95 disabled:opacity-20 flex-shrink-0">
                      {sending ? "..." : t("chat.send")}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* REVIEW MODAL */}
      {reviewModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-[#09091a] max-w-md w-full p-8 rounded-3xl border border-purple-500/30 shadow-[0_0_50px_rgba(139,92,246,0.25)]">
            {modalView === "rate" && (
              <>
                <div className="text-center mb-6">
                  <div className="text-5xl mb-4 animate-bounce">⭐</div>
                  <h2 className="text-xl font-black uppercase tracking-wider text-slate-100">{t("review.title")}</h2>
                  <p className="text-purple-300 text-xs mt-1 font-semibold">{reviewModal.serviceTitle}</p>
                  <p className="text-slate-500 text-[10px] uppercase font-bold mt-1">{t("dashboard.withExpert", { name: reviewModal.expertName })}</p>
                </div>
                <div className="mb-6 text-center">
                  <p className="text-[10px] uppercase tracking-widest font-black text-purple-400 mb-3">{t("review.rating")}</p>
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} onClick={() => setModalRating(star)}
                        onMouseEnter={() => setModalHover(star)} onMouseLeave={() => setModalHover(0)}
                        className="transition-transform hover:scale-125 focus:outline-none"
                      >
                        <StarIcon size={32} className={star <= (modalHover || modalRating) ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" : "text-slate-700 hover:text-amber-300/40"} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-6">
                  <textarea value={modalComment} onChange={(e) => setModalComment(e.target.value)}
                    className="bg-slate-900 border border-purple-500/15 text-slate-100 text-xs p-3 rounded-xl w-full focus:outline-none focus:ring-1 focus:ring-purple-400" rows={3} placeholder={t("review.commentPlaceholder")}
                  />
                </div>
                {modalError && <div className="p-3 bg-rose-950/40 border border-rose-500/20 text-rose-400 text-xs rounded-xl mb-4 font-mono">{modalError}</div>}
                <div className="flex gap-3">
                  <button onClick={handleModalReviewSubmit} disabled={modalSubmitting || modalRating === 0} className="py-3 bg-gradient-to-r from-purple-600 to-cyan-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex-1 disabled:opacity-20 shadow-[0_0_15px_rgba(139,92,246,0.3)]">{modalSubmitting ? t("review.submitting") : t("review.submit")}</button>
                  <button onClick={closeModal} className="py-3 border border-purple-500/10 hover:bg-slate-900 text-slate-400 font-bold text-xs uppercase tracking-wider rounded-xl px-5 transition-colors">{t("common.cancel")}</button>
                </div>
                <div className="mt-6 pt-4 border-t border-purple-500/10 text-center">
                  <button onClick={() => setModalView("report")} className="text-[10px] text-rose-400 hover:text-rose-300 font-bold uppercase tracking-wider">⚠️ {t("dashboard.reportCoach")}</button>
                </div>
              </>
            )}
            {modalView === "report" && (
              <>
                <div className="text-center mb-6">
                  <div className="text-5xl mb-4 animate-pulse">⚠️</div>
                  <h2 className="text-xl font-black uppercase tracking-wider text-rose-400">{t("report.title")}</h2>
                  <p className="text-slate-400 text-xs mt-1">{reviewModal.serviceTitle}</p>
                </div>
                <div className="mb-4">
                  <select value={modalReportReason} onChange={(e) => setModalReportReason(e.target.value)} className="bg-slate-900 border border-purple-500/15 text-slate-100 text-xs p-3 rounded-xl w-full focus:outline-none focus:ring-1 focus:ring-purple-400">
                    <option value="">{t("report.reasonSelect")}</option>
                    <option value="Scam or fraudulent">{t("report.reasonScam")}</option>
                    <option value="Harassment or abuse">{t("report.reasonHarassment")}</option>
                    <option value="Unprofessional behavior">{t("report.reasonUnprofessional")}</option>
                    <option value="Other">{t("report.reasonOther")}</option>
                  </select>
                </div>
                <div className="mb-6">
                  <textarea value={modalReportDesc} onChange={(e) => setModalReportDesc(e.target.value)}
                    className="bg-slate-900 border border-purple-500/15 text-slate-100 text-xs p-3 rounded-xl w-full focus:outline-none focus:ring-1 focus:ring-purple-400" rows={3} placeholder={t("report.descriptionPlaceholder")}
                  />
                </div>
                {modalReportMsg && (
                  <div className={`p-3 text-xs font-mono rounded-xl mb-4 ${modalReportMsg.includes("success") ? "bg-emerald-950/40 border border-emerald-500/20 text-emerald-400" : "bg-rose-950/40 border border-rose-500/20 text-rose-400"}`}>
                    {modalReportMsg}
                  </div>
                )}
                <div className="flex gap-3">
                  <button onClick={handleModalReportSubmit} disabled={modalReportSubmitting || !modalReportReason} className="py-3 bg-gradient-to-r from-rose-600 to-pink-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex-1 disabled:opacity-20 shadow-[0_0_15px_rgba(244,63,94,0.3)]">{modalReportSubmitting ? "..." : t("report.submit")}</button>
                  <button onClick={() => setModalView("rate")} className="py-3 border border-purple-500/10 hover:bg-slate-900 text-slate-400 font-bold text-xs uppercase tracking-wider rounded-xl px-5 transition-colors">{t("common.back")}</button>
                </div>
              </>
            )}
            {modalView === "done" && (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">👾</div>
                <h2 className="text-xl font-black uppercase tracking-wider text-slate-100 mb-2">{modalRating > 0 ? t("review.success") : t("report.success")}</h2>
                <button onClick={closeModal} className="mt-6 py-3 px-8 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 text-white font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-[0_0_15px_rgba(139,92,246,0.3)]">
                  {t("common.back")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}