export const STUN_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export function createPeerConnection(
  onRemoteStream: (stream: MediaStream) => void,
  onIceCandidate: (candidate: RTCIceCandidate) => void,
): RTCPeerConnection {
  const pc = new RTCPeerConnection(STUN_SERVERS);

  pc.ontrack = (event) => {
    if (event.streams[0]) onRemoteStream(event.streams[0]);
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) onIceCandidate(event.candidate);
  };

  return pc;
}

export async function startLocalStream(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({ video: true, audio: false });
}

export function stopLocalStream(stream: MediaStream) {
  stream.getTracks().forEach((t) => t.stop());
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
