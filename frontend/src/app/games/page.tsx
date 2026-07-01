"use client";

import { useState, useEffect } from "react";
import { useLocale } from "@/i18n/LocaleContext";
import F1ReactionTime from "@/components/games/F1ReactionTime";
import PrecisionTap from "@/components/games/PrecisionTap";
import SequenceMemory from "@/components/games/SequenceMemory";

const GAMES = [
  {
    id: "f1",
    nameKey: "games.f1Name",
    descKey: "games.f1Desc",
    icon: "🏎️",
    bgGradient: "from-red-500/20 to-transparent",
    glow: "hover:shadow-[0_0_50px_rgba(239,68,68,0.3)]",
    borderColor: "group-hover:border-red-500/50",
    iconBg: "bg-red-500/10 text-red-400 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]",
    playBtn: "bg-red-500/10 text-red-400 border border-red-500/30 group-hover:bg-red-500 group-hover:text-white group-hover:border-red-400",
    storageKey: "f1_best",
    formatBest: (v: number) => (v ? `${v}ms` : null),
  },
  {
    id: "precision",
    nameKey: "games.precisionName",
    descKey: "games.precisionDesc",
    icon: "⏱️",
    bgGradient: "from-emerald-500/20 to-transparent",
    glow: "hover:shadow-[0_0_50px_rgba(16,185,129,0.3)]",
    borderColor: "group-hover:border-emerald-500/50",
    iconBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]",
    playBtn: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-400",
    storageKey: "precision_best",
    formatBest: (v: number) => (v ? `${v}%` : null),
  },
  {
    id: "memory",
    nameKey: "games.memoryName",
    descKey: "games.memoryDesc",
    icon: "🧠",
    bgGradient: "from-purple-500/20 to-transparent",
    glow: "hover:shadow-[0_0_50px_rgba(168,85,247,0.3)]",
    borderColor: "group-hover:border-purple-500/50",
    iconBg: "bg-purple-500/10 text-purple-400 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]",
    playBtn: "bg-purple-500/10 text-purple-400 border border-purple-500/30 group-hover:bg-purple-500 group-hover:text-white group-hover:border-purple-400",
    storageKey: "memory_best",
    formatBest: (v: number) => (v ? `Level ${v}` : null),
  },
];

export default function GamesPage() {
  const { t } = useLocale();
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});

  useEffect(() => {
    const loaded: Record<string, number> = {};
    for (const game of GAMES) {
      const val = Number(localStorage.getItem(game.storageKey)) || 0;
      if (val > 0) loaded[game.id] = val;
    }
    setScores(loaded);
  }, []);

  const active = GAMES.find((g) => g.id === activeGame);

  return (
    <div className="min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto relative z-10">
      
      {/* Ambient Background Darkening (Helps pop against bright background images) */}
      <div className="fixed inset-0 bg-slate-950/40 pointer-events-none -z-10" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] bg-emerald-500/10 blur-[150px] rounded-full pointer-events-none -z-10" />

      {/* ── Header ── */}
      {!activeGame && (
        <div className="text-center mb-16 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/50 backdrop-blur-md border border-white/10 text-emerald-400 text-xs font-black uppercase tracking-widest mb-6 shadow-xl">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            AthleteX Arcade
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 tracking-tight mb-6 drop-shadow-lg">
            {t("games.title")}
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto font-medium leading-relaxed drop-shadow-md">
            {t("games.subtitle")}
          </p>
        </div>
      )}

      {/* ── Games Grid ── */}
      {!activeGame ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {GAMES.map((game, i) => {
            const best = scores[game.id];
            return (
              <button
                key={game.id}
                onClick={() => setActiveGame(game.id)}
                className={`group relative flex flex-col items-start p-8 rounded-[2.5rem] bg-slate-900/80 backdrop-blur-xl border border-white/10 transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02] text-left overflow-hidden ${game.glow} ${game.borderColor} animate-fade-up`}
                style={{ animationDelay: `${i * 0.15}s` }}
              >
                {/* Internal Ambient Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${game.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

                {/* Giant Background Icon */}
                <div className="absolute -right-8 -bottom-8 text-[120px] opacity-[0.03] group-hover:opacity-10 transition-all duration-500 pointer-events-none transform group-hover:rotate-12 group-hover:scale-110">
                  {game.icon}
                </div>

                {/* Floating Icon Badge */}
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-8 transition-transform duration-500 group-hover:-translate-y-1 ${game.iconBg}`}>
                  {game.icon}
                </div>

                {/* Content */}
                <h3 className="text-2xl font-black text-white mb-3 relative z-10 tracking-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-300 transition-colors">
                  {t(game.nameKey)}
                </h3>
                <p className="text-slate-400 text-sm font-medium leading-relaxed mb-10 relative z-10">
                  {t(game.descKey)}
                </p>

                {/* Footer: Play Button & Score */}
                <div className="w-full flex items-end justify-between mt-auto relative z-10">
                  <span className={`px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all duration-300 shadow-lg ${game.playBtn}`}>
                    {t("games.play")}
                  </span>

                  {best && (
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                        Best Score
                      </span>
                      <span className="text-lg font-black text-white bg-white/5 px-3 py-1 rounded-lg border border-white/10">
                        {game.formatBest(best)}
                      </span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* ── Active Game View ── */
        <div className="animate-in fade-in zoom-in-95 duration-500 max-w-3xl mx-auto">
          <button
            onClick={() => setActiveGame(null)}
            className="group mb-6 inline-flex items-center gap-3 text-sm font-bold text-slate-400 hover:text-white transition-colors"
          >
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-900/80 border border-white/10 group-hover:bg-white/10 group-hover:border-white/20 transition-all shadow-lg backdrop-blur-md">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </span>
            <span className="tracking-wide">Arcade Menu</span>
          </button>

          <div className="bg-slate-900/90 backdrop-blur-2xl p-6 sm:p-10 lg:p-12 rounded-[2.5rem] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] relative overflow-hidden">
            {/* Ambient Active Game Glow */}
            <div className={`absolute top-0 right-0 w-96 h-96 bg-gradient-to-br ${active?.bgGradient} blur-[120px] pointer-events-none rounded-full mix-blend-screen opacity-50`} />

            <div className="text-center mb-8 relative z-10">
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-3xl text-4xl mb-4 ${active?.iconBg}`}>
                {active?.icon}
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 tracking-tight drop-shadow-md">
                {t(active?.nameKey ?? "")}
              </h2>
              <div className="h-1 w-16 mx-auto rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            </div>

            <div className="mt-8 relative z-10">
              {activeGame === "f1" && <F1ReactionTime t={t} />}
              {activeGame === "precision" && <PrecisionTap t={t} />}
              {activeGame === "memory" && <SequenceMemory t={t} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
