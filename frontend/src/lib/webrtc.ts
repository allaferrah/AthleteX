let turnConfig: RTCConfiguration | null = null;

const FREE_TURN: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443?transport=tcp",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

let audioSink: HTMLAudioElement | null = null;

function ensureAudioSink(): HTMLAudioElement {
  if (!audioSink) {
    audioSink = document.createElement("audio");
    audioSink.setAttribute("playsinline", "");
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
      turnConfig = { iceServers: [...data.iceServers, ...FREE_TURN] };
      return turnConfig;
    }
    return null;
  } catch {
    return null;
  }
}

function getIceServers(): RTCConfiguration {
  if (turnConfig?.iceServers?.length) return turnConfig;
  return { iceServers: FREE_TURN };
}

export interface CreatePcCallbacks {
  onRemoteStream: (stream: MediaStream) => void;
  onIceCandidate: (candidate: RTCIceCandidate) => void;
  onIceFailed?: () => void;
}

export function createPeerConnection(cb: CreatePcCallbacks): RTCPeerConnection {
  const pc = new RTCPeerConnection(getIceServers());

  pc.ontrack = (event) => {
    console.log("📹 ontrack — kind:", event.track?.kind, "streams:", event.streams?.length);
    if (event.track.kind === "audio" && event.streams[0]) {
      const el = ensureAudioSink();
      el.srcObject = event.streams[0];
      el.play().catch((e) => console.warn("🔇 audio play failed:", e.message));
    }
    if (event.track.kind === "video" && event.streams[0]) {
      cb.onRemoteStream(event.streams[0]);
    }
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) cb.onIceCandidate(event.candidate);
  };

  pc.oniceconnectionstatechange = () => {
    console.log("🧊 ICE connection state:", pc.iceConnectionState);
    if (pc.iceConnectionState === "failed" && cb.onIceFailed) cb.onIceFailed();
  };

  pc.onicegatheringstatechange = () => {
    console.log("🧊 ICE gathering state:", pc.iceGatheringState);
  };

  pc.onsignalingstatechange = () => {
    console.log("📡 Signaling state:", pc.signalingState);
  };

  pc.onconnectionstatechange = () => {
    console.log("🔗 Connection state:", pc.connectionState);
    if (pc.connectionState === "failed" && cb.onIceFailed) cb.onIceFailed();
  };

  return pc;
}

export async function startLocalStream(): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
    audio: { echoCancellation: true, noiseSuppression: true },
  });
  console.log("📷 Local stream tracks:", stream.getTracks().map((t) => `${t.kind}:${t.enabled}`));
  return stream;
}

export function stopLocalStream(stream: MediaStream) {
  stream.getTracks().forEach((t) => t.stop());
}

export async function waitForDeviceRelease(): Promise<void> {
  return new Promise((r) => setTimeout(r, 300));
}

export function cleanupAudioSink() {
  if (audioSink) {
    audioSink.srcObject = null;
  }
}

export async function createOffer(pc: RTCPeerConnection): Promise<RTCSessionDescriptionInit> {
  const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
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
