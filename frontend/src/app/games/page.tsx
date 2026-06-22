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
    gradient: "from-red-600/20 via-orange-600/10 to-transparent",
    borderGlow: "hover:border-red-500/30",
    storageKey: "f1_best",
    formatBest: (v: number) => (v ? `${v}ms` : null),
  },
  {
    id: "precision",
    nameKey: "games.precisionName",
    descKey: "games.precisionDesc",
    icon: "⏱️",
    gradient: "from-emerald-600/20 via-teal-600/10 to-transparent",
    borderGlow: "hover:border-emerald-500/30",
    storageKey: "precision_best",
    formatBest: (v: number) => (v ? `${v}%` : null),
  },
  {
    id: "memory",
    nameKey: "games.memoryName",
    descKey: "games.memoryDesc",
    icon: "🧠",
    gradient: "from-purple-600/20 via-indigo-600/10 to-transparent",
    borderGlow: "hover:border-purple-500/30",
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
    <div className="min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <div className="text-center mb-12 animate-fade-up">
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-3 tracking-tight">
          {t("games.title")}
        </h1>
        <div className="h-1 w-20 mx-auto rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 mb-4" />
        <p className="text-gray-400 max-w-lg mx-auto">
          {t("games.subtitle")}
        </p>
      </div>

      {!activeGame ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {GAMES.map((game, i) => {
            const best = scores[game.id];
            return (
              <button
                key={game.id}
                onClick={() => setActiveGame(game.id)}
                className={`group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-b ${game.gradient} ${game.borderGlow} transition-all duration-500 text-left p-7 hover:translate-y-[-6px] hover:shadow-2xl hover:shadow-black/40 animate-fade-up`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="absolute -top-12 -right-12 text-8xl opacity-[0.04] group-hover:opacity-[0.08] transition-opacity duration-500 select-none pointer-events-none">
                  {game.icon}
                </div>

                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-500">
                  {game.icon}
                </div>

                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-emerald-300 transition-colors">
                  {t(game.nameKey)}
                </h3>

                <p className="text-sm text-gray-400 leading-relaxed">
                  {t(game.descKey)}
                </p>

                <div className="mt-5 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/[0.06] text-white text-sm font-semibold group-hover:bg-emerald-600/30 group-hover:text-emerald-300 transition-all">
                    ▶ {t("games.play")}
                  </span>

                  {best && (
                    <span className="text-xs text-gray-500">
                      Best: <strong className="text-emerald-400">{game.formatBest(best)}</strong>
                    </span>
                  )}
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500/0 to-transparent group-hover:via-emerald-500/40 transition-all duration-500" />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="animate-fade-in">
          <button
            onClick={() => setActiveGame(null)}
            className="group mb-8 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors"
          >
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.04] group-hover:bg-white/[0.08] transition-all">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </span>
            <span>Back to games</span>
          </button>

          <div className="glass-card-premium p-6 sm:p-8">
            <div className="text-center mb-2">
              <span className="text-4xl block mb-2">{active?.icon}</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1">
                {t(active?.nameKey ?? "")}
              </h2>
              <div className="h-0.5 w-12 mx-auto rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500" />
            </div>

            <div className="mt-8">
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
