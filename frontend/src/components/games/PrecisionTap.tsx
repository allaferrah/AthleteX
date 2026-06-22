"use client";

import { useState, useRef, useEffect, useCallback } from "react";

type Phase = "idle" | "playing" | "result";

const RATINGS = [
  { min: 90, label: "Perfect", emoji: "🎯", color: "text-yellow-400" },
  { min: 70, label: "Great", emoji: "👍", color: "text-emerald-400" },
  { min: 50, label: "Good", emoji: "👌", color: "text-blue-400" },
  { min: 30, label: "Decent", emoji: "🤷", color: "text-orange-400" },
  { min: 0, label: "Miss", emoji: "💨", color: "text-red-400" },
];

function getRating(score: number) {
  return RATINGS.find((r) => score >= r.min) ?? RATINGS[RATINGS.length - 1];
}

export default function PrecisionTap({ t }: { t: (k: string) => string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [position, setPosition] = useState(50);
  const [direction, setDirection] = useState(1);
  const [scores, setScores] = useState<number[]>([]);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [round, setRound] = useState(0);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const animRef = useRef(0);
  const speedRef = useRef(1.5);

  const STORAGE_KEY = "precision_best";
  const [best, setBest] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return Number(localStorage.getItem(STORAGE_KEY)) || 0;
  });

  const animate = useCallback(() => {
    setPosition((prev) => {
      let next = prev + direction * speedRef.current;
      if (next >= 93) { next = 93; setDirection(-1); }
      if (next <= 7) { next = 7; setDirection(1); }
      return next;
    });
    animRef.current = requestAnimationFrame(animate);
  }, [direction]);

  useEffect(() => {
    if (phase === "playing") {
      speedRef.current = 1.5 + round * 0.3;
      animRef.current = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [phase, round, animate]);

  const handleTap = () => {
    if (phase === "idle") {
      setPhase("playing"); setScores([]); setRound(0); setLastScore(null); setFlashColor(null);
      return;
    }
    if (phase === "playing") {
      const center = 50;
      const distance = Math.abs(position - center);
      const score = Math.max(0, Math.round((1 - distance / 50) * 100));
      setLastScore(score);
      const rating = getRating(score);
      const colorMap: Record<string, string> = { "text-yellow-400": "yellow", "text-emerald-400": "emerald", "text-blue-400": "blue", "text-orange-400": "orange", "text-red-400": "red" };
      setFlashColor(colorMap[rating.color] ?? "emerald");
      setTimeout(() => setFlashColor(null), 400);
      const newScores = [...scores, score];
      setScores(newScores);
      const newRound = round + 1;

      if (newRound >= 8) {
        cancelAnimationFrame(animRef.current);
        setPhase("result");
        const avg = Math.round(newScores.reduce((a, b) => a + b, 0) / newScores.length);
        if (avg > best) {
          setBest(avg);
          localStorage.setItem(STORAGE_KEY, String(avg));
        }
      } else {
        setRound(newRound);
      }
      return;
    }
    if (phase === "result") {
      setPhase("idle"); setScores([]); setRound(0); setLastScore(null); setFlashColor(null);
    }
  };

  const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const totalRounds = 8;

  const needleRotation = ((position - 50) / 50) * 90;

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-gray-400 text-center max-w-md text-sm">{t("games.precisionInstructions")}</p>

      <div
        className="glass-sm p-6 sm:p-8 w-full max-w-sm flex flex-col items-center gap-5 transition-all duration-300"
        style={flashColor ? { boxShadow: `0 0 0 2px ${flashColor === "emerald" ? "rgba(16,185,129,0.3)" : flashColor === "yellow" ? "rgba(234,179,8,0.3)" : flashColor === "red" ? "rgba(239,68,68,0.3)" : flashColor === "orange" ? "rgba(249,115,22,0.3)" : flashColor === "blue" ? "rgba(59,130,246,0.3)" : "rgba(16,185,129,0.3)"}` } : {}}
      >
        <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-widest">
          <span className={`w-2 h-2 rounded-full ${phase === "playing" ? "bg-emerald-500 animate-pulse" : "bg-gray-600"}`} />
          {phase === "idle" ? "Ready" : phase === "playing" ? `Round ${round + 1}/${totalRounds}` : "Complete"}
        </div>

        <div className="w-full relative">
          <div className="h-3 bg-gray-800/80 rounded-full overflow-hidden relative">
            <div
              className="absolute inset-y-0 rounded-full"
              style={{
                left: "28%",
                right: "28%",
                background: "linear-gradient(90deg, rgba(34,197,94,0.15), rgba(34,197,94,0.35), rgba(34,197,94,0.15))",
                borderLeft: "1px solid rgba(34,197,94,0.3)",
                borderRight: "1px solid rgba(34,197,94,0.3)",
              }}
            />

            <div
              className="absolute top-0 bottom-0 w-2.5 -ml-1 rounded-full transition-all duration-75"
              style={{
                left: `calc(${position}% - 4px)`,
                background: `linear-gradient(180deg, #f0f4ff, ${position > 35 && position < 65 ? "#22c55e" : "#ef4444"})`,
                boxShadow: `0 0 12px ${position > 35 && position < 65 ? "rgba(34,197,94,0.6)" : "rgba(239,68,68,0.4)"}`,
              }}
            />
          </div>

          <div className="flex justify-between mt-1.5 text-[10px] text-gray-600">
            <span>0%</span>
            <span className="text-emerald-600/60">Target</span>
            <span>100%</span>
          </div>
        </div>

        <button
          onClick={handleTap}
          className={`btn-primary w-full touch-manipulation ${phase === "playing" ? "animate-pulse-glow" : ""}`}
        >
          <span>
            {phase === "idle" && "▶ Start Challenge"}
            {phase === "playing" && "⏹ TAP!"}
            {phase === "result" && "🔄 New Challenge"}
          </span>
        </button>
      </div>

      {lastScore !== null && (
        <div className="animate-scale-in flex flex-col items-center gap-1">
          <div className={`text-5xl font-black ${getRating(lastScore).color}`}>
            {lastScore}<span className="text-xl ml-1">%</span>
          </div>
          <div className={`flex items-center gap-2 text-lg font-semibold ${getRating(lastScore).color}`}>
            <span>{getRating(lastScore).emoji}</span>
            <span>{getRating(lastScore).label}</span>
          </div>
        </div>
      )}

      {scores.length > 0 && (
        <div className="w-full max-w-sm">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>Progress</span>
            <span>Avg: {avg}%</span>
          </div>
          <div className="flex gap-1 h-8 items-end">
            {scores.map((s, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <span className="text-[9px] text-gray-500">{s}</span>
                <div
                  className="w-full rounded-t transition-all"
                  style={{
                    height: `${Math.max(15, s * 0.6)}%`,
                    background: `linear-gradient(180deg, ${s >= 80 ? "#22c55e" : s >= 50 ? "#eab308" : "#ef4444"}, transparent)`,
                    opacity: i === scores.length - 1 ? 1 : 0.5,
                  }}
                />
              </div>
            ))}
            {Array.from({ length: totalRounds - scores.length }).map((_, i) => (
              <div key={`e-${i}`} className="flex-1 flex flex-col items-center justify-end">
                <div className="w-full h-1 rounded bg-gray-800/50" />
              </div>
            ))}
          </div>
        </div>
      )}

      {phase === "result" && (
        <div className="glass-sm p-5 w-full max-w-sm animate-scale-in">
          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider text-center mb-3">Results</h4>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-2xl font-bold text-white">{avg}<span className="text-xs ml-0.5">%</span></div>
              <div className="text-xs text-gray-500">Average</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-400">{Math.max(...scores)}<span className="text-xs ml-0.5">%</span></div>
              <div className="text-xs text-gray-500">Best</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-400">{Math.min(...scores)}<span className="text-xs ml-0.5">%</span></div>
              <div className="text-xs text-gray-500">Lowest</div>
            </div>
          </div>
          <div className="mt-3 text-center">
            <span className={`badge ${avg >= 70 ? "badge-emerald" : avg >= 40 ? "badge-orange" : "badge-red"}`}>
              {getRating(avg).emoji} {getRating(avg).label}
            </span>
          </div>
        </div>
      )}

      <div className="text-sm text-gray-500">
        Best: <strong className="text-emerald-400">{best}%</strong>
        {best > 0 && (
          <span className="ml-2 text-gray-600">
            {best >= 90 ? "🎯" : best >= 70 ? "👍" : best >= 50 ? "👌" : "💪"}
          </span>
        )}
      </div>
    </div>
  );
}
