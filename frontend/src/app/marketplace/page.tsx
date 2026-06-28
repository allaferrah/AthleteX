"use client";

import Link from "next/link";
import { useLocale } from "@/i18n/LocaleContext";

export default function MarketplaceLanding() {
  const { t } = useLocale();

  const categories = [
    {
      slug: "sports",
      icon: "🏋️",
      gradient: "from-amber-500/20 to-orange-500/10",
      borderHover: "hover:border-amber-500/30",
      glow: "shadow-[0_0_40px_rgba(245,158,11,0.1)]",
      features: [
        t("marketplace.sportsFeature1"),
        t("marketplace.sportsFeature2"),
        t("marketplace.sportsFeature3"),
        t("marketplace.sportsFeature4"),
      ],
    },
    {
      slug: "nutrition",
      icon: "🥗",
      gradient: "from-emerald-500/20 to-teal-500/10",
      borderHover: "hover:border-emerald-500/30",
      glow: "shadow-[0_0_40px_rgba(16,185,129,0.1)]",
      features: [
        t("marketplace.nutritionFeature1"),
        t("marketplace.nutritionFeature2"),
        t("marketplace.nutritionFeature3"),
        t("marketplace.nutritionFeature4"),
      ],
    },
  ];

  return (
    <div className="relative">
      {/* Decorative background gradients */}
      <div className="absolute top-0 left-1/4 w-80 h-80 bg-emerald-500/5 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-500/5 rounded-full filter blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="glass p-8 sm:p-10 text-center mb-16 animate-fade-up relative z-10 rounded-2xl border border-white/5 max-w-3xl mx-auto">
        <div className="badge badge-emerald mb-4 border border-emerald-500/20 px-3 py-1">{t("marketplace.verifiedBadge")}</div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight leading-none">
          {t("marketplace.title")}{" "}
          <span className="gradient-text bg-gradient-shift">{t("marketplace.titleHighlight")}</span>
        </h1>
        <p className="text-slate-400 max-w-xl mx-auto text-base sm:text-lg font-sans">
          {t("marketplace.subtitle")}
        </p>
      </div>

      {/* Category Cards */}
      <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto relative z-10">
        {categories.map((cat, i) => {
          const catTitle = cat.slug === "sports" ? t("marketplace.sports") : t("marketplace.nutrition");
          const catDesc = cat.slug === "sports" ? t("marketplace.sportsDesc") : t("marketplace.nutritionDesc");
          const categoryLabel = cat.slug === "sports" ? t("nav.sports") : t("nav.nutrition");
          return (
            <Link
              key={cat.slug}
              href={`/marketplace/${cat.slug}`}
              className={`glass-card-premium p-8 md:p-10 border border-white/5 ${cat.borderHover} ${cat.glow} group animate-fade-up-d${i + 1} flex flex-col justify-between`}
              style={{ animationDelay: `${i * 150}ms` }}
            >
              <div>
                {/* Icon */}
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center text-4xl mb-6 shadow-md border border-white/5 transform transition-all duration-500 group-hover:-translate-y-2 group-hover:scale-105`}>
                  {cat.icon}
                </div>

                {/* Title */}
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 group-hover:translate-x-1 transition-transform tracking-tight">
                  {catTitle}
                  <span className="inline-block ml-2 text-slate-500 group-hover:text-emerald-400 transition-colors">→</span>
                </h2>

                {/* Description */}
                <p className="text-slate-400 mb-8 leading-relaxed text-sm md:text-base font-sans">
                  {catDesc}
                </p>
              </div>

              <div>
                {/* Features */}
                <div className="flex flex-wrap gap-2 mb-8">
                  {cat.features.map((f) => (
                    <span key={f} className="badge text-[11px] bg-white/10 text-slate-300 border border-white/80 font-sans">
                      {f}
                    </span>
                  ))}
                </div>

                {/* Browse button */}
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400 group-hover:text-emerald-300 transition-colors">
                  <span>{t("marketplace.browseExperts", { category: categoryLabel })}</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Stats */}
      <div className="mt-20 max-w-3xl mx-auto text-center animate-fade-up-d3 relative z-10">
        <div className="glass-card-premium p-8 border border-white/80">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { value: "50+", label: t("marketplace.statExperts"), color: "text-amber-400" },
              { value: "200+", label: t("marketplace.statServices"), color: "text-emerald-400" },
              { value: "4.9★", label: t("marketplace.statRating"), color: "text-purple-400" },
            ].map((s) => (
              <div key={s.label}>
                <p className={`text-3xl md:text-4xl font-black tracking-tight ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
