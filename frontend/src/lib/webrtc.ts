let turnConfig: RTCConfiguration | null = null;

// Reliable Google STUN servers — the old openrelay.metered.ca TURN servers
// are dead.  For NAT-traversal behind symmetric NAT you need working TURN
// credentials via the /api/turn-credentials endpoint (Twilio).
const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
];

let audioSink: HTMLAudioElement | null = null;

export function ensureAudioSink(): HTMLAudioElement {
  if (!audioSink) {
    audioSink = document.createElement("audio");
    audioSink.setAttribute("playsinline", "");
    audioSink.setAttribute("autoplay", "");
    audioSink.muted = false;
    audioSink.style.display = "none";
    document.body.appendChild(audioSink);
  }
  return audioSink;
}

export async function fetchTurnCredentials(): Promise<RTCConfiguration | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://athletix-backend.onrender.com";
    const res = await fetch(`${baseUrl}/api/turn-credentials`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.iceServers?.length) {
      turnConfig = { iceServers: [...data.iceServers, ...ICE_SERVERS] };
      return turnConfig;
    }
    return null;
  } catch {
    return null;
  }
}

function getIceServers(): RTCConfiguration {
  if (turnConfig?.iceServers?.length) return turnConfig;
  return { iceServers: ICE_SERVERS };
}

export interface CreatePcCallbacks {
  onRemoteStream: (stream: MediaStream) => void;
  onIceCandidate: (candidate: RTCIceCandidate) => void;
  onIceFailed?: () => void;
  onIceStateChange?: (state: string) => void;
  onDisconnected?: () => void;
}

export async function playMediaElement(el: HTMLVideoElement | HTMLAudioElement, maxRetries = 5): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await el.play();
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 400));
    }
  }
}

export function playAudioSink(): void {
  const el = ensureAudioSink();
  playMediaElement(el, 5);
}

export function createPeerConnection(cb: CreatePcCallbacks): RTCPeerConnection {
  const pc = new RTCPeerConnection(getIceServers());

  pc.ontrack = (event) => {
    console.log("📹 ontrack — kind:", event.track?.kind, "streams:", event.streams?.length);
    if (event.track.kind === "audio") {
      const el = ensureAudioSink();
      el.srcObject = new MediaStream([event.track]);
      playMediaElement(el, 5);
    }
    if (event.track.kind === "video") {
      cb.onRemoteStream(new MediaStream([event.track]));
    }
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) cb.onIceCandidate(event.candidate);
  };

  pc.oniceconnectionstatechange = () => {
    const state = pc.iceConnectionState;
    console.log("🧊 ICE connection state:", state);
    cb.onIceStateChange?.(state);
    if (state === "failed") cb.onIceFailed?.();
    if (state === "disconnected") cb.onDisconnected?.();
  };

  pc.onicegatheringstatechange = () => {
    console.log("🧊 ICE gathering state:", pc.iceGatheringState);
  };

  pc.onsignalingstatechange = () => {
    console.log("📡 Signaling state:", pc.signalingState);
  };

  // connectionState is logged but NOT used for UI to avoid race with iceConnectionState
  pc.onconnectionstatechange = () => {
    const state = pc.connectionState;
    console.log("🔗 Connection state:", state);
    if (state === "failed") cb.onIceFailed?.();
  };

  return pc;
}

let iceRestartAttempts = 0;
const MAX_ICE_RESTART_ATTEMPTS = 2;

export async function attemptIceRestart(pc: RTCPeerConnection): Promise<RTCSessionDescriptionInit | null> {
  if (!pc || pc.connectionState === "closed") return null;
  if (iceRestartAttempts >= MAX_ICE_RESTART_ATTEMPTS) {
    console.warn("❌ Max ICE restart attempts reached");
    return null;
  }
  iceRestartAttempts++;
  return restartIce(pc);
}

export function resetIceRestartAttempts(): void {
  iceRestartAttempts = 0;
}

export function stopLocalStream(stream: MediaStream) {
  stream.getTracks().forEach((t) => t.stop());
}

export async function waitForDeviceRelease(): Promise<void> {
  return new Promise((r) => setTimeout(r, 800));
}

export async function startLocalStream(): Promise<MediaStream> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 500));
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      console.log("📷 Local stream tracks:", stream.getTracks().map((t) => `${t.kind}:${t.enabled}`));
      return stream;
    } catch (err) {
      console.warn(`📷 getUserMedia attempt ${attempt + 1} failed:`, err);
      lastErr = err;
    }
  }
  throw lastErr;
}

export function cleanupAudioSink() {
  if (audioSink) {
    audioSink.pause();
    audioSink.srcObject = null;
  }
}

export function addLocalTracks(pc: RTCPeerConnection, stream: MediaStream) {
  stream.getTracks().forEach((track) => {
    pc.addTrack(track, stream);
  });
}

export async function createOffer(pc: RTCPeerConnection): Promise<RTCSessionDescriptionInit> {
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  return offer;
}

export async function createAnswer(pc: RTCPeerConnection): Promise<RTCSessionDescriptionInit> {
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  return answer;
}

export async function setRemoteDescription(
  pc: RTCPeerConnection,
  desc: RTCSessionDescriptionInit,
) {
  await pc.setRemoteDescription(new RTCSessionDescription(desc));
}

export async function addIceCandidate(pc: RTCPeerConnection, candidate: RTCIceCandidateInit) {
  await pc.addIceCandidate(new RTCIceCandidate(candidate));
}

export async function restartIce(pc: RTCPeerConnection): Promise<RTCSessionDescriptionInit | null> {
  try {
    const offer = await pc.createOffer({ iceRestart: true });
    await pc.setLocalDescription(offer);
    return offer;
  } catch (err) {
    console.error("❌ ICE restart failed:", err);
    return null;
  }
}
