"use client";

import { useEffect, useState } from "react";
import { sportCategoryAPI } from "@/lib/api";
import Link from "next/link";
import { useLocale } from "@/i18n/LocaleContext";
import Image from "next/image";

interface SportCategory {
  id: string;
  name: string;
  nameAr: string;
  icon: string;
  imageUrl: string | null;
  description: string;
  descriptionAr: string;
  sortOrder: number;
  _count: { services: number };
}

export default function SportsPage() {
  const [sports, setSports] = useState<SportCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { t, locale } = useLocale();

  useEffect(() => {
    sportCategoryAPI.getAll()
      .then(setSports)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = sports.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.nameAr.includes(search) ||
      s.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-2 animate-fade-up">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/marketplace" className="text-sm text-slate-500 hover:text-emerald-400 transition-colors">
              {t("nav.marketplace")}
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-sm text-amber-400 font-semibold">{t("nav.sports")}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <span>🏋️</span> {t("nav.sports")}
          </h1>
          <p className="text-slate-400">{t("marketplace.sportsSubtitle")}</p>
        </div>
        <div className="relative w-full md:w-72">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("marketplace.searchSports")}
            className="input-field pl-11"
          />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass overflow-hidden animate-pulse">
              <div className="h-32 bg-slate-800/60" />
              <div className="p-5 space-y-3">
                <div className="h-5 bg-slate-800/60 rounded w-2/3" />
                <div className="h-4 bg-slate-800/40 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="glass p-16 text-center mt-8 animate-fade-up">
          <div className="text-6xl mb-4">🏋️</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {search ? t("marketplace.noServicesSearch", { category: t("nav.sports") }) : t("marketplace.noServicesCategoryYet", { category: t("nav.sports") })}
          </h2>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            {search ? t("marketplace.noServicesSearchDesc") : t("marketplace.noServicesCategoryYetDesc", { category: "Sports" })}
          </p>
          <Link href="/marketplace" className="btn-ghost inline-block">
            {t("marketplace.backToCategories")}
          </Link>
        </div>
      )}

      {/* Sport Category Grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {filtered.map((sport) => {
            const sportName = locale === "ar" ? sport.nameAr : sport.name;
            const sportDesc = locale === "ar" ? sport.descriptionAr : sport.description;
            return (
              <Link
                key={sport.id}
                href={`/marketplace/sports/${sport.id}`}
                className="glass card-hover overflow-hidden group cursor-pointer border border-transparent hover:border-amber-500/30 hover:shadow-[0_0_30px_rgba(245,158,11,0.12)] transition-all duration-300 block"
              >
                <div className={`h-32 relative overflow-hidden ${sport.imageUrl ? "" : "bg-gradient-to-br from-amber-600/30 to-orange-600/20 flex items-center justify-center"}`}>
                  {sport.imageUrl ? (
                    <>
                      <Image src={sport.imageUrl} alt={sportName} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
                      <div className="absolute bottom-3 right-3 z-10">
                        <span className="badge bg-amber-500/20 text-amber-400 text-xs shadow-lg backdrop-blur-sm">
                          {sport._count.services} {t("marketplace.statServices")}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-6xl opacity-20 group-hover:scale-110 transition-transform duration-500">{sport.icon}</div>
                      <div className="absolute bottom-3 right-3">
                        <span className="badge bg-amber-500/20 text-amber-400 text-xs shadow-lg">
                          {sport._count.services} {t("marketplace.statServices")}
                        </span>
                      </div>
                    </>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold text-white mb-1 group-hover:text-amber-400 transition-colors">{sport.imageUrl ? "" : sport.icon + " "}{sportName}</h3>
                  <p className="text-slate-400 text-sm mb-4 line-clamp-2">{sportDesc}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">{sport._count.services} {t("services.active")}</span>
                    <span className="text-amber-400 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">{t("marketplace.browseSport")} →</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
