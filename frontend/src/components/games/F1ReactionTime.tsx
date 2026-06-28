"use client";

import { useState, useRef, useCallback, useEffect } from "react";

type Phase = "idle" | "ready" | "waiting" | "tooEarly" | "result";

const RATINGS = [
  { max: 150, label: "F1 Elite", emoji: "🏆", color: "text-yellow-400" },
  { max: 200, label: "Pro", emoji: "🏎️", color: "text-emerald-400" },
  { max: 250, label: "Good", emoji: "👍", color: "text-blue-400" },
  { max: 300, label: "Average", emoji: "👌", color: "text-orange-400" },
  { max: Infinity, label: "Needs Practice", emoji: "🐢", color: "text-red-400" },
];

function getRating(ms: number) {
  return RATINGS.find((r) => ms < r.max) ?? RATINGS[RATINGS.length - 1];
}

export default function F1ReactionTime({ t }: { t: (k: string) => string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [lights, setLights] = useState(0);
  const [attempts, setAttempts] = useState<number[]>([]);
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const startTimeRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const STORAGE_KEY = "f1_best";
  const [best, setBest] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return Number(localStorage.getItem(STORAGE_KEY)) || 0;
  });

  const clear = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timeoutRef.current = null;
    intervalRef.current = null;
  }, []);

  useEffect(() => clear, [clear]);

  const startSequence = () => {
    clear();
    setPhase("ready");
    setLights(0);
    setCurrentTime(null);
    setShowSummary(false);

    let i = 0;
    intervalRef.current = setInterval(() => {
      i++;
      setLights(i);
      if (i >= 5) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        const delay = 1000 + Math.random() * 2000;
        timeoutRef.current = setTimeout(() => {
          setPhase("waiting");
          setLights(6);
          startTimeRef.current = Date.now();
        }, delay);
      }
    }, 400);
  };

  const handleClick = () => {
    if (phase === "idle") { startSequence(); return; }
    if (phase === "ready") {
      clear(); setPhase("tooEarly"); setLights(0);
      const newAttempts = [...attempts, 999];
      setAttempts(newAttempts);
      return;
    }
    if (phase === "waiting") {
      const reaction = Date.now() - startTimeRef.current;
      setCurrentTime(reaction);
      const newAttempts = [...attempts, reaction];
      setAttempts(newAttempts);
      setPhase("result");
      if (best === 0 || reaction < best) {
        setBest(reaction);
        localStorage.setItem(STORAGE_KEY, String(reaction));
      }
      if (newAttempts.length >= 5) {
        setShowSummary(true);
      }
      return;
    }
    if (phase === "result") {
      if (showSummary) {
        setAttempts([]); setCurrentTime(null); setPhase("idle"); setLights(0); setShowSummary(false);
      } else {
        startSequence();
      }
      return;
    }
    if (phase === "tooEarly") {
      startSequence();
    }
  };

  const avg = attempts.length > 0 ? Math.round(attempts.filter((a) => a < 999).reduce((a, b) => a + b, 0) / Math.max(1, attempts.filter((a) => a < 999).length)) : 0;
  const rating = currentTime ? getRating(currentTime) : null;

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-slate-500 text-center max-w-md text-sm">{t("games.f1Instructions")}</p>

      <div className="glass-sm p-6 sm:p-8 w-full max-w-sm flex flex-col items-center gap-5">
        <div className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-widest">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          {phase === "waiting" ? "GO!" : phase === "ready" ? "Countdown..." : phase === "tooEarly" ? "False Start" : phase === "result" ? "Result" : "Ready"}
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        </div>

        <div className="flex gap-3 sm:gap-4" dir="ltr">
          {[1, 2, 3, 4, 5].map((n) => (
            <div
              key={n}
              className={`w-10 h-10 sm:w-14 sm:h-14 rounded-full transition-all duration-200 flex items-center justify-center text-[10px] font-bold ${
                phase === "waiting" && lights === 6
                  ? "bg-green-500 shadow-[0_0_30px_#22c55e,0_0_60px_rgba(34,197,94,0.4)] scale-110"
                  : n <= lights && phase !== "tooEarly"
                    ? "bg-red-500 shadow-[0_0_20px_#ef4444,0_0_40px_rgba(239,68,68,0.3)]"
                    : "bg-gray-800 shadow-inner"
              } ${phase === "ready" && n === lights ? "animate-pulse" : ""}`}
            >
              {phase === "waiting" && lights === 6 ? "GO" : n}
            </div>
          ))}
        </div>

        <button
          onClick={handleClick}
          className={`btn-primary w-full text-center touch-manipulation ${phase === "waiting" ? "animate-pulse-glow" : ""}`}
        >
          <span>
            {phase === "idle" && "▶ Start Race"}
            {phase === "ready" && "⏳ Wait for Green..."}
            {phase === "tooEarly" && "🔄 Restart"}
            {phase === "waiting" && "⚡ TAP NOW!"}
            {phase === "result" && (showSummary ? "🔄 New Session" : "▶ Next Attempt")}
          </span>
        </button>
      </div>

      {currentTime !== null && rating && (
        <div className="animate-scale-in flex flex-col items-center gap-1">
          <div className={`text-5xl font-black tracking-tight ${rating.color}`}>
            {currentTime}
            <span className="text-2xl font-bold ml-1">ms</span>
          </div>
          <div className={`flex items-center gap-2 text-lg font-semibold ${rating.color}`}>
            <span>{rating.emoji}</span>
            <span>{rating.label}</span>
          </div>
        </div>
      )}

      {attempts.length > 0 && !showSummary && (
        <div className="w-full max-w-sm">
          <div className="flex justify-between text-xs text-slate-400 mb-2">
            <span>Attempt {attempts.length}/5</span>
            <span>Avg: {avg}ms</span>
          </div>
          <div className="flex gap-1.5 h-2">
            {attempts.map((a, i) => (
              <div
                key={i}
                className={`flex-1 rounded-full transition-all ${a < 999 ? (a < 200 ? "bg-emerald-500" : a < 300 ? "bg-yellow-500" : "bg-red-500") : "bg-red-600"}`}
                style={{ opacity: 0.4 + (i === attempts.length - 1 ? 0.6 : 0) }}
              />
            ))}
            {Array.from({ length: 5 - attempts.length }).map((_, i) => (
              <div key={`e-${i}`} className="flex-1 rounded-full bg-gray-700/50" />
            ))}
          </div>
        </div>
      )}

      {showSummary && (
        <div className="glass-sm p-5 w-full max-w-sm animate-scale-in">
          <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider text-center mb-3">Session Summary</h4>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-2xl font-bold text-white">{avg}<span className="text-xs ml-0.5">ms</span></div>
              <div className="text-xs text-slate-400">Average</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-400">{Math.min(...attempts.filter((a) => a < 999))}<span className="text-xs ml-0.5">ms</span></div>
              <div className="text-xs text-slate-400">Best</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-400">{Math.max(...attempts.filter((a) => a < 999))}<span className="text-xs ml-0.5">ms</span></div>
              <div className="text-xs text-slate-400">Worst</div>
            </div>
          </div>
          <div className="mt-3 text-center">
            <span className={`badge ${avg < 200 ? "badge-emerald" : avg < 300 ? "badge-orange" : "badge-red"}`}>
              {getRating(avg).emoji} {getRating(avg).label}
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 text-sm">
        <span className="text-slate-400">
          Best: <strong className="text-emerald-400">{best}ms</strong>
        </span>
        <span className="text-gray-600">•</span>
        <span className="text-slate-400">
          {best > 0 && best < 200 ? getRating(best).emoji + " " + getRating(best).label : "Keep trying!"}
        </span>
      </div>
    </div>
  );
}
