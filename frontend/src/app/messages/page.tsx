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
  fetchTurnCredentials,
} from "@/lib/webrtc";
import { useCallSound } from "@/lib/useCallSound";
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
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [callMuted, setCallMuted] = useState(false);
  const [callCameraOn, setCallCameraOn] = useState(true);
  const [callLogId, setCallLogId] = useState<string | null>(null);
  const [callError, setCallError] = useState<string | null>(null);
  const [socketError, setSocketError] = useState<string | null>(null);
  const { playRingtone, stopRingtone } = useCallSound();
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const durationRef = useRef<NodeJS.Timeout | null>(null);

  const cleanupCall = useCallback(() => {
    if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
    if (localStreamRef.current) { stopLocalStream(localStreamRef.current); localStreamRef.current = null; }
    if (durationRef.current) { clearInterval(durationRef.current); durationRef.current = null; }
    setLocalStream(null); setRemoteStream(null); setCallDuration(0);
    setIncomingCall(null); setCallLogId(null); setCallError(null);
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

    socket.on("call:incoming", (data: { from: string; callerName: string; callerPhoto: string | null; callLogId: string; offer: any }) => {
      setIncomingCall(data);
      playRingtone();
    });

    socket.on("call:accepted", async ({ callLogId: id, answer, from }: { callLogId: string; answer: any; from: string }) => {
      stopRingtone();
      setCallLogId(id); setCallState("connected");
      const pc = peerRef.current;
      if (pc && answer) {
        try { await setRemoteDescription(pc, answer); } catch {}
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
      if (pc && candidate) {
        try { await addIceCandidate(pc, candidate); } catch {}
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
    if (!selectedPartner) return;
    setCallError(null);
    try {
      await fetchTurnCredentials();
      const stream = await startLocalStream();
      localStreamRef.current = stream;
      setLocalStream(stream);
      setCallState("calling");

      const pc = createPeerConnection(
        (remote) => { setRemoteStream(remote); },
        (candidate) => {
          const socket = getSocket();
          if (socket) socket.emit("call:ice-candidate", { to: selectedPartner, candidate });
        },
        () => {
          setCallError("Connection lost. Check your network and try a different connection.");
          cleanupCall(); setCallState("idle");
        },
      );
      peerRef.current = pc;

      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
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
    if (!incomingCall) return;
    setCallError(null);
    stopRingtone();
    try {
      await fetchTurnCredentials();
      const stream = await startLocalStream();
      localStreamRef.current = stream;
      setLocalStream(stream);
      setCallState("connected");
      setCallLogId(incomingCall.callLogId);

      const pc = createPeerConnection(
        (remote) => { setRemoteStream(remote); },
        (candidate) => {
          const socket = getSocket();
          if (socket) socket.emit("call:ice-candidate", { to: incomingCall.from, candidate });
        },
        () => {
          setCallError("Connection lost. Check your network and try a different connection.");
          cleanupCall(); setCallState("idle");
        },
      );
      peerRef.current = pc;

      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      if (incomingCall.offer) {
        await setRemoteDescription(pc, incomingCall.offer);
        const answer = await createAnswer(pc);
        console.log("📞 Call answer created for", incomingCall.from);

        const socket = getSocket();
        if (socket) {
          socket.emit("call:accept", { callLogId: incomingCall.callLogId, calleeId: incomingCall.from, answer });
        }
      }

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

  const handleAcceptCall = async () => {
    if (!incomingCall) return;
    setCallError(null);
    stopRingtone();
    try {
      await fetchTurnCredentials();
      const stream = await startLocalStream();
      localStreamRef.current = stream;
      setLocalStream(stream);
      setCallState("connected");
      setCallLogId(incomingCall.callLogId);

      const pc = createPeerConnection(
        (remote) => { setRemoteStream(remote); },
        (candidate) => {
          const socket = getSocket();
          if (socket) socket.emit("call:ice-candidate", { to: incomingCall.from, candidate });
        },
        () => { setCallError("Could not establish connection. Try a different network."); },
      );
      peerRef.current = pc;

      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      if (incomingCall.offer) {
        await setRemoteDescription(pc, incomingCall.offer);
        const answer = await createAnswer(pc);

        const socket = getSocket();
        if (socket) {
          socket.emit("call:accept", { callLogId: incomingCall.callLogId, calleeId: incomingCall.from, answer });
        }
      }

      setIncomingCall(null);

      durationRef.current = setInterval(() => {
        setCallDuration((d) => d + 1);
      }, 1000);
    } catch {
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
    if (socket && selectedPartner && callState === "connected") {
      socket.emit("call:end", { to: selectedPartner, callLogId, duration: callDuration });
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
    <div>
      {/* ─── Video Call Overlay ──────────────────────────────────────── */}
      {socketError && (
        <div className="fixed top-0 left-0 right-0 z-[200] bg-red-600/90 text-white px-4 py-3 text-sm text-center font-medium">
          {socketError}
        </div>
      )}
      {callError && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[110] bg-red-500/20 border border-red-500/30 text-red-400 px-6 py-3 rounded-xl text-sm font-medium animate-fade-in backdrop-blur-sm max-w-md text-center">
          {callError}
        </div>
      )}
      {localStream && callState === "connected" && (
        <VideoCallOverlay
          localStream={localStream}
          remoteStream={remoteStream}
          partnerName={incomingCall ? incomingCall.callerName : selectedPartnerEmail}
          partnerPhoto={incomingCall ? incomingCall.callerPhoto : partnerPhoto}
          duration={callDuration}
          muted={callMuted}
          cameraOn={callCameraOn}
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
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-gray-700 mx-auto mb-4 flex items-center justify-center text-3xl animate-pulse">
              📹
            </div>
            <p className="text-white text-lg font-semibold">{t("call.calling")}</p>
            <p className="text-gray-400 text-sm mt-1">{selectedPartnerEmail}</p>
            <button onClick={handleEndCall} className="mt-6 btn-primary !bg-red-600 !px-8">
              <span>{t("call.endCall")}</span>
            </button>
          </div>
        </div>
      )}

      {callState === "ended" && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center pointer-events-none">
          <div className="text-center animate-fade-in">
            <div className="text-4xl mb-3">📞</div>
            <p className="text-white text-lg">{t("call.callEnded")}</p>
            {callDuration > 0 && (
              <p className="text-gray-400 text-sm mt-1">
                {Math.floor(callDuration / 60)}:{String(callDuration % 60).padStart(2, "0")}
              </p>
            )}
          </div>
        </div>
      )}

      {incomingCall && (
        <IncomingCallModal
          callerName={incomingCall.callerName}
          callerPhoto={incomingCall.callerPhoto}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}

      {/* ─── Page ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6 animate-fade-up">
        <Link href="/" className="text-sm text-slate-500 hover:text-emerald-400 transition-colors">{t("nav.home")}</Link>
        <span className="text-slate-600">/</span>
        <span className="text-sm text-white font-semibold">{t("nav.messages")}</span>
      </div>

      <div className="glass border border-white/5 overflow-hidden animate-fade-up-d1" style={{ height: "calc(100vh - 220px)", minHeight: "500px" }}>
        <div className="flex h-full">
          {/* Conversation List */}
          <div className={`${selectedPartner ? "hidden lg:flex" : "flex"} w-full lg:w-72 lg:w-80 border-r border-white/5 flex-col flex-shrink-0`}>
            <div className="p-4 border-b border-white/5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><span>💬</span> {t("chat.conversations")}</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingConvos ? (
                <div className="p-4 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-lg bg-slate-800/40 animate-pulse" />)}</div>
              ) : conversations.length === 0 ? (
                  <div className="p-6 text-center">
                    <div className="text-4xl mb-3 opacity-60">📭</div>
                    <p className="text-slate-500 text-sm">{t("chat.noConversations")}</p>
                    <p className="text-slate-500 text-xs mt-1">{t("chat.noConversationsDesc")}</p>
                    <Link href="/marketplace" className="btn-primary !py-1.5 !px-4 text-xs mt-4 inline-block"><span>{t("dashboard.browseServices")}</span></Link>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button key={conv.partnerId} onClick={() => selectConversation(conv.partnerId, conv.partnerEmail)}
                    className={`w-full p-4 text-left hover:bg-white/5 transition-colors border-b border-white/[0.03] flex items-center gap-3 ${selectedPartner === conv.partnerId ? "bg-emerald-500/10 border-l-2 border-l-emerald-500" : ""}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-black flex-shrink-0">
                      {conv.partnerEmail[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-white truncate">{conv.partnerEmail}</span>
                        <div className="flex items-center gap-1.5">
                          {missedCalls.has(conv.partnerId) && (
                            <span className="text-[10px] text-red-400 font-semibold" title={t("call.missedCallLabel")}>
                              🕐
                            </span>
                          )}
                          {conv.unreadCount > 0 && <span className="w-5 h-5 rounded-full bg-emerald-500 text-[10px] font-bold text-black flex items-center justify-center flex-shrink-0">{conv.unreadCount}</span>}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{conv.lastMessage}</p>
                      <p className="text-[10px] text-slate-600 mt-0.5">{new Date(conv.lastMessageAt).toLocaleDateString()}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className={`${selectedPartner ? "flex" : "hidden lg:flex"} flex-1 flex-col min-w-0`}>
            {!selectedPartner ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="text-6xl mb-4 opacity-30">💬</div>
                  <h3 className="text-lg font-bold text-white mb-2">{t("chat.yourMessages")}</h3>
                  <p className="text-slate-500 text-sm">{t("chat.selectConversation")}</p>
                </div>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
                  <button onClick={() => setSelectedPartner(null)} className="lg:hidden text-slate-400 hover:text-white mr-1">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  {partnerPhoto ? (
                    <Image src={partnerPhoto} alt="" width={36} height={36} className="w-9 h-9 rounded-full object-cover border border-emerald-500/30" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-black flex-shrink-0">
                      {selectedPartnerEmail[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white truncate">{selectedPartnerEmail}</p>
                      {missedCalls.has(selectedPartner) && (
                        <span className="text-[10px] text-red-400 font-semibold">{t("call.missedCallLabel")} 🕐</span>
                      )}
                    </div>
                    <p className={`text-[10px] ${partnerOnline ? "text-emerald-400" : "text-slate-500"}`}>
                      {partnerOnline ? t("common.online") : t("common.offline")}
                    </p>
                  </div>
                  <button
                    onClick={handleStartCall}
                    disabled={callState !== "idle"}
                    className="btn-ghost !p-2.5 !rounded-full flex-shrink-0 disabled:opacity-30"
                    title={t("call.videoCall")}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="23 7 16 12 23 17 23 7" />
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                    </svg>
                  </button>
                </div>

                {/* Order Payment Banner */}
                {currentOrder && currentOrder.paymentStatus && (
                  <div className={`px-5 py-3 border-b ${currentOrder.paymentStatus === "RELEASED" ? "border-emerald-500/20 bg-emerald-500/5" : currentOrder.paymentStatus === "HELD" ? "border-blue-500/20 bg-blue-500/5" : "border-white/5"}`}>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0">
                        {currentOrder.paymentStatus === "HELD" && <span className="text-sm">🔒</span>}
                        {currentOrder.paymentStatus === "RELEASED" && <span className="text-sm">✅</span>}
                        {currentOrder.paymentStatus === "PENDING" && <span className="text-sm">⏳</span>}
                        {currentOrder.paymentStatus === "REFUNDED" && <span className="text-sm">↩️</span>}
                        <span className="text-sm text-slate-300">
                          {currentOrder.service?.title && <span className="font-semibold text-white">{currentOrder.service.title}</span>}
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
                            className="btn-primary !py-1.5 !px-4 text-xs disabled:opacity-50 whitespace-nowrap"
                          >
                            <span>{payActionLoading ? "..." : t("dashboard.payNowAmount", { amount: fDZD(currentOrder.amount || currentOrder.service?.price || 0) })}</span>
                          </button>
                        )}
                        {currentOrder.paymentStatus === "HELD" && (
                          <button onClick={() => handlePayAction("release")} disabled={payActionLoading}
                            className="btn-primary !py-1.5 !px-4 text-xs disabled:opacity-50 whitespace-nowrap"
                          >
                            <span>{payActionLoading ? "..." : t("dashboard.confirmDelivery")}</span>
                          </button>
                        )}
                      </div>
                    </div>
                    {payActionMsg && (
                      <p className={`text-xs mt-2 ${payActionMsg.includes("successfully") || payActionMsg.includes("released") ? "text-emerald-400" : "text-red-400"}`}>
                        {payActionMsg}
                      </p>
                    )}
                  </div>
                )}

                {/* Messages */}
                <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-5 space-y-3 overscroll-contain">
                  {loadingMsgs ? (
                    <div className="flex items-center justify-center h-full"><div className="text-slate-500 text-sm">{t("chat.loadingMessages")}</div></div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="text-4xl mb-3 opacity-40">👋</div>
                        <p className="text-slate-500 text-sm">{t("chat.startChat")}</p>
                      </div>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.senderId === user?.id;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${isMe ? "bg-gradient-to-r from-emerald-600 to-cyan-600 text-white rounded-br-md" : "glass-sm text-slate-200 rounded-bl-md"}`}>
                            {msg.content && <p className="leading-relaxed">{msg.content}</p>}
                            {msg.imageUrl && (
                              <Image src={msg.imageUrl} alt="Shared image" width={0} height={0} sizes="100vw"
                                className={`rounded-xl max-h-64 object-cover w-auto h-auto ${msg.content ? "mt-2" : ""} ${isMe ? "" : "border border-white/5"}`}
                                onClick={() => window.open(msg.imageUrl!, "_blank")} style={{ cursor: "pointer" }}
                              />
                            )}
                            <p className={`text-[10px] mt-1.5 ${isMe ? "text-emerald-200/60" : "text-slate-500"}`}>
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
                <div className="p-4 border-t border-white/5">
                  {uploadError && (
                    <div className="mb-2 p-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg flex items-center gap-2">
                      <span>⚠️</span> {uploadError}
                    </div>
                  )}
                  <div className="flex gap-2 items-center">
                    <button type="button" onClick={() => document.getElementById("chat-image-input")?.click()} className="btn-ghost !p-2.5 !rounded-full flex-shrink-0" title={t("chat.sendPhoto")}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
                      className="input-field flex-1 !rounded-full" placeholder={t("chat.typeMessage")} autoComplete="off"
                    />
                    <button onClick={handleSend} disabled={sending || !newMessage.trim()} className="btn-primary !py-2.5 !px-5 text-sm disabled:opacity-50">
                      <span>{sending ? "..." : t("chat.send")}</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass max-w-lg w-full p-8 rounded-2xl shadow-2xl border border-slate-700/50">
            {modalView === "rate" && (
              <>
                <div className="text-center mb-6">
                  <div className="text-5xl mb-3">⭐</div>
                  <h2 className="text-2xl font-bold text-white">{t("review.title")}</h2>
                  <p className="text-slate-400 text-sm mt-1">{reviewModal.serviceTitle}</p>
                  <p className="text-slate-500 text-xs">{t("dashboard.withExpert", { name: reviewModal.expertName })}</p>
                </div>
                <div className="mb-6 text-center">
                  <p className="text-sm font-semibold text-slate-300 mb-3">{t("review.rating")}</p>
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} onClick={() => setModalRating(star)}
                        onMouseEnter={() => setModalHover(star)} onMouseLeave={() => setModalHover(0)}
                        className="transition-all hover:scale-125 focus:outline-none"
                      >
                        <StarIcon size={36} className={star <= (modalHover || modalRating) ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" : "text-slate-600 hover:text-amber-300/50"} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-6">
                  <textarea value={modalComment} onChange={(e) => setModalComment(e.target.value)}
                    className="input-field w-full" rows={3} placeholder={t("review.commentPlaceholder")}
                  />
                </div>
                {modalError && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg mb-4">{modalError}</div>}
                <div className="flex gap-3">
                  <button onClick={handleModalReviewSubmit} disabled={modalSubmitting || modalRating === 0} className="btn-primary flex-1 disabled:opacity-50">{modalSubmitting ? t("review.submitting") : t("review.submit")}</button>
                  <button onClick={closeModal} className="btn-ghost px-5">{t("common.cancel")}</button>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-700/30 text-center">
                  <button onClick={() => setModalView("report")} className="text-xs text-red-400 hover:text-red-300 transition-colors font-medium">⚠️ {t("dashboard.reportCoach")}</button>
                </div>
              </>
            )}
            {modalView === "report" && (
              <>
                <div className="text-center mb-6">
                  <div className="text-5xl mb-3">⚠️</div>
                  <h2 className="text-2xl font-bold text-white">{t("report.title")}</h2>
                  <p className="text-slate-400 text-sm mt-1">{reviewModal.serviceTitle}</p>
                </div>
                <div className="mb-4">
                  <select value={modalReportReason} onChange={(e) => setModalReportReason(e.target.value)} className="input-field w-full">
                    <option value="">{t("report.reasonSelect")}</option>
                    <option value="Scam or fraudulent">{t("report.reasonScam")}</option>
                    <option value="Harassment or abuse">{t("report.reasonHarassment")}</option>
                    <option value="Unprofessional behavior">{t("report.reasonUnprofessional")}</option>
                    <option value="Other">{t("report.reasonOther")}</option>
                  </select>
                </div>
                <div className="mb-6">
                  <textarea value={modalReportDesc} onChange={(e) => setModalReportDesc(e.target.value)}
                    className="input-field w-full" rows={3} placeholder={t("report.descriptionPlaceholder")}
                  />
                </div>
                {modalReportMsg && (
                  <div className={`p-3 text-sm rounded-lg mb-4 ${modalReportMsg.includes("success") ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border border-red-500/20 text-red-400"}`}>
                    {modalReportMsg}
                  </div>
                )}
                <div className="flex gap-3">
                  <button onClick={handleModalReportSubmit} disabled={modalReportSubmitting || !modalReportReason} className="btn-primary flex-1 bg-gradient-to-r from-red-500 to-pink-500 disabled:opacity-50">{modalReportSubmitting ? "..." : t("report.submit")}</button>
                  <button onClick={() => setModalView("rate")} className="btn-ghost px-5">{t("common.back")}</button>
                </div>
              </>
            )}
            {modalView === "done" && (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">✅</div>
                <h2 className="text-2xl font-bold text-white mb-2">{modalRating > 0 ? t("review.success") : t("report.success")}</h2>
                <button onClick={closeModal} className="btn-primary mt-6 px-8"><span>{t("common.back")}</span></button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
