"use client";

interface Props {
  callerName: string;
  callerPhoto: string | null;
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCallModal({
  callerName,
  callerPhoto,
  onAccept,
  onReject,
}: Props) {
  return (
    <div className="fixed inset-0 z-[110] bg-black/70 flex items-end sm:items-center justify-center">
      <div className="w-full max-w-sm bg-slate-900 border border-white/5 rounded-t-2xl sm:rounded-2xl p-8 animate-slide-in">
        <div className="flex flex-col items-center gap-4">
          {callerPhoto ? (
            <img
              src={callerPhoto}
              alt={callerName}
              className="w-20 h-20 rounded-full object-cover ring-2 ring-emerald-500/50"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-700 ring-2 ring-emerald-500/50 flex items-center justify-center text-3xl text-slate-500">
              {callerName?.charAt(0)?.toUpperCase() || "?"}
            </div>
          )}

          <div className="text-center">
            <p className="text-lg font-bold text-white">{callerName}</p>
            <p className="text-sm text-emerald-400 flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Incoming video call
            </p>
          </div>

          <div className="flex items-center gap-8 mt-2">
            <button
              onClick={onReject}
              className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center text-white hover:bg-red-500 transition-all touch-manipulation min-touch shadow-lg"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>

            <button
              onClick={onAccept}
              className="w-16 h-16 rounded-full bg-emerald-600 flex items-center justify-center text-white hover:bg-emerald-500 transition-all touch-manipulation min-touch shadow-lg animate-pulse-glow"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Accept with video and audio
          </p>
        </div>
      </div>
    </div>
  );
}
