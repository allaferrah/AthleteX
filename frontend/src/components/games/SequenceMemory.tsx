"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const COLORS = [
  { bg: "#ef4444", glow: "rgba(239,68,68,0.6)", name: "red" },
  { bg: "#22c55e", glow: "rgba(34,197,94,0.6)", name: "green" },
  { bg: "#3b82f6", glow: "rgba(59,130,246,0.6)", name: "blue" },
  { bg: "#eab308", glow: "rgba(234,179,8,0.6)", name: "yellow" },
];

type Phase = "idle" | "showing" | "input" | "result";

export default function SequenceMemory({ t }: { t: (k: string) => string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerIdx, setPlayerIdx] = useState(0);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [level, setLevel] = useState(0);
  const [flashCount, setFlashCount] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const STORAGE_KEY = "memory_best";
  const [best, setBest] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return Number(localStorage.getItem(STORAGE_KEY)) || 0;
  });

  const clear = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);

  useEffect(() => clear, [clear]);

  const showSequence = useCallback((seq: number[], idx = 0) => {
    if (idx >= seq.length) {
      setPhase("input");
      setPlayerIdx(0);
      setFlashCount(0);
      return;
    }
    setPhase("showing");
    setActiveIdx(seq[idx]);
    setFlashCount((c) => c + 1);
    timeoutRef.current = setTimeout(() => {
      setActiveIdx(null);
      timeoutRef.current = setTimeout(() => showSequence(seq, idx + 1), 250);
    }, 500);
  }, []);

  const startGame = () => {
    clear();
    const first = Math.floor(Math.random() * 4);
    const seq = [first];
    setSequence(seq);
    setLevel(1);
    setFlashCount(0);
    showSequence(seq);
  };

  const handleColorClick = (colorIdx: number) => {
    if (phase !== "input") return;
    setActiveIdx(colorIdx);
    setTimeout(() => setActiveIdx(null), 180);

    if (colorIdx !== sequence[playerIdx]) {
      clear();
      setPhase("result");
      const prevBest = Number(localStorage.getItem(STORAGE_KEY)) || 0;
      const score = level - 1;
      if (score > prevBest) {
        setBest(score);
        localStorage.setItem(STORAGE_KEY, String(score));
      }
      return;
    }

    const nextIdx = playerIdx + 1;
    if (nextIdx >= sequence.length) {
      setPhase("showing");
      setFlashCount(0);
      const newSeq = [...sequence, Math.floor(Math.random() * 4)];
      setSequence(newSeq);
      setLevel((l) => l + 1);
      setTimeout(() => showSequence(newSeq), 600);
    } else {
      setPlayerIdx(nextIdx);
    }
  };

  const progress = sequence.length > 0 ? (playerIdx / sequence.length) * 100 : 0;

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-slate-500 text-center max-w-md text-sm">{t("games.memoryInstructions")}</p>

      <div className={`glass-sm p-6 sm:p-8 w-full max-w-sm flex flex-col items-center gap-5 ${phase === "showing" ? "animate-pulse-glow" : ""}`}>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-widest">
            <span className={`w-2 h-2 rounded-full ${phase === "showing" ? "bg-blue-500 animate-pulse" : phase === "input" ? "bg-emerald-500" : "bg-gray-600"}`} />
            {phase === "idle" ? "Ready" : phase === "showing" ? `Watch... ${flashCount}/${sequence.length}` : phase === "input" ? "Your Turn" : "Done"}
          </div>
          {phase !== "idle" && (
            <span className="badge badge-emerald">
              Level {level}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {COLORS.map((color, i) => (
            <button
              key={i}
              onClick={() => handleColorClick(i)}
              disabled={phase !== "input"}
              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl transition-all duration-150 touch-manipulation ${
                activeIdx === i
                  ? "scale-110 brightness-150"
                  : phase === "input"
                    ? "brightness-75 hover:brightness-100 hover:scale-105 cursor-pointer"
                    : "brightness-75 cursor-default"
              }`}
              style={{
                backgroundColor: color.bg,
                boxShadow: activeIdx === i ? `0 0 30px ${color.glow}, 0 0 60px ${color.glow}` : "none",
              }}
            />
          ))}
        </div>

        {phase === "input" && sequence.length > 0 && (
          <div className="w-full">
            <div className="flex justify-between text-[10px] text-gray-600 mb-1">
              <span>Sequence progress</span>
              <span>{playerIdx}/{sequence.length}</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <button
          onClick={startGame}
          className="btn-primary w-full touch-manipulation"
        >
          <span>
            {phase === "idle" && "▶ Start Game"}
            {phase === "result" && "🔄 Play Again"}
            {(phase === "showing" || phase === "input") && ""}
          </span>
        </button>
      </div>

      {phase === "result" && (
        <div className="glass-sm p-5 w-full max-w-sm animate-scale-in">
          <div className="text-center">
            <div className="text-5xl mb-2">🧠</div>
            <h4 className="text-lg font-bold text-red-400 mb-1">Game Over</h4>
            <p className="text-3xl font-black text-white mb-1">
              Level <span className="text-emerald-400">{level}</span>
            </p>
            <p className="text-sm text-slate-400 mb-3">
              Sequence of {sequence.length} colors remembered
            </p>
            {level - 1 >= best && level - 1 > 0 && (
              <div className="badge badge-orange text-sm px-4 py-1.5 animate-pulse">
                🏆 New Personal Best!
              </div>
            )}
            {level === 1 && (
              <p className="text-xs text-gray-600 mt-2">Tip: Try saying the colors aloud as they flash!</p>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 text-sm">
        <span className="text-slate-400">
          Best: <strong className="text-emerald-400">Level {best}</strong>
        </span>
        {best > 0 && (
          <>
            <span className="text-gray-600">•</span>
            <span className="text-slate-400">
              {best >= 10 ? "🧠 Genius!" : best >= 7 ? "🌟 Excellent!" : best >= 5 ? "👏 Great!" : best >= 3 ? "👍 Good!" : "🌱 Keep going!"}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
