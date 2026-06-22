"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  localStream: MediaStream;
  remoteStream: MediaStream | null;
  partnerName: string;
  partnerPhoto: string | null;
  duration: number;
  muted: boolean;
  cameraOn: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onEndCall: () => void;
}

export default function VideoCallOverlay({
  localStream,
  remoteStream,
  partnerName,
  partnerPhoto,
  duration,
  muted,
  cameraOn,
  onToggleMute,
  onToggleCamera,
  onEndCall,
}: Props) {
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localRef.current) localRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteRef.current && remoteStream) {
      remoteRef.current.srcObject = remoteStream;
      remoteRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      <div className="relative flex-1 bg-black">
        <video
          ref={remoteRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />

        {!remoteStream && (
          <div className="absolute inset-0 flex items-center justify-center">
            {partnerPhoto ? (
              <img
                src={partnerPhoto}
                alt={partnerName}
                className="w-24 h-24 rounded-full object-cover opacity-60"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center text-3xl text-gray-400">
                {partnerName?.charAt(0)?.toUpperCase() || "?"}
              </div>
            )}
            <p className="absolute bottom-8 text-gray-400 text-sm">
              {partnerName}
            </p>
          </div>
        )}

        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 px-4 py-1.5 rounded-full text-white text-sm font-mono">
          {fmt(duration)}
        </div>

        <div className="absolute top-4 right-4 w-28 h-36 sm:w-32 sm:h-44 rounded-xl overflow-hidden border-2 border-white/20 shadow-xl">
          <video
            ref={localRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />
          {!cameraOn && (
            <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-lg">
                {partnerName?.charAt(0)?.toUpperCase() || "?"}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-6 px-4 py-5 bg-gray-900/95 backdrop-blur-sm safe-bottom">
        <button
          onClick={onToggleMute}
          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-xl transition-all touch-manipulation min-touch ${
            muted
              ? "bg-red-600 text-white"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          {muted ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
          )}
        </button>

        <button
          onClick={onToggleCamera}
          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-xl transition-all touch-manipulation min-touch ${
            !cameraOn
              ? "bg-red-600 text-white"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          {!cameraOn ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M21 15V9a2 2 0 0 0-2-2H9l7 7v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1"/></svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
          )}
        </button>

        <button
          onClick={onEndCall}
          className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-red-600 flex items-center justify-center text-white hover:bg-red-500 transition-all touch-manipulation min-touch shadow-lg shadow-red-600/40"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        </button>
      </div>
    </div>
  );
}
