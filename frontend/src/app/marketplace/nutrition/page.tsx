"use client";

import { useEffect, useState } from "react";
import { serviceAPI } from "@/lib/api";
import Link from "next/link";
import { useLocale } from "@/i18n/LocaleContext";
import { fDZD } from "@/lib/format";
import StarRating from "@/components/StarRating";
import Image from "next/image";

interface ExpertProfile {
  fullName: string | null;
  photoUrl: string | null;
  specialization: string | null;
  yearsExperience: number | null;
}

interface Expert {
  email: string;
  isSuspended?: boolean;
  averageRating?: number;
  totalReviews?: number;
  oneStarCount?: number;
  profile: ExpertProfile | null;
}

interface Service {
  id: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string | null;
  category: string;
  expert: Expert;
  averageRating?: number;
  reviewCount?: number;
}

export default function NutritionPage() {
  const { t } = useLocale();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await serviceAPI.getAll("NUTRITION");
        setServices(data);
      } catch {
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = services.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase()) ||
      s.expert?.profile?.fullName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="glass p-6 sm:p-8 animate-fade-up rounded-2xl border border-white/5 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link href="/marketplace" className="text-sm text-slate-500 hover:text-emerald-400 transition-colors">
                {t("nav.marketplace")}
              </Link>
              <span className="text-slate-400">/</span>
              <span className="text-sm text-emerald-400 font-semibold">{t("nav.nutrition")}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <span>🥗</span> {t("nav.nutrition")}
            </h1>
            <p className="text-slate-400">{t("marketplace.nutritionSubtitle")}</p>
          </div>
          <div className="relative w-full md:w-72">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("marketplace.searchNutrition")}
            className="input-field pl-11"
          />
        </div>
      </div>
    </div>

      {loading && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass overflow-hidden animate-pulse">
              <div className="h-40 bg-slate-800/60" />
              <div className="p-6 space-y-3">
                <div className="h-5 bg-slate-800/60 rounded w-3/4" />
                <div className="h-4 bg-slate-800/40 rounded w-full" />
                <div className="h-4 bg-slate-800/40 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="glass p-16 text-center mt-8 animate-fade-up">
          <div className="text-6xl mb-4">🥗</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {search ? t("marketplace.noServicesSearch", { category: t("nav.nutrition") }) : t("marketplace.noServicesCategoryYet", { category: t("nav.nutrition") })}
          </h2>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            {search ? t("marketplace.noServicesSearchDesc") : t("marketplace.noServicesCategoryYetDesc", { category: "Nutrition and diet" })}
          </p>
          <Link href="/marketplace" className="btn-ghost inline-block">
            {t("marketplace.backToCategories")}
          </Link>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {filtered.map((service) => {
            const expertName = service.expert?.profile?.fullName || service.expert?.email || t("marketplace.expert");
            const expertPhoto = service.expert?.profile?.photoUrl;

            return (
              <Link
                key={service.id}
                href={`/marketplace/${service.id}`}
                className="glass card-hover overflow-hidden group cursor-pointer border border-transparent hover:border-emerald-500/30 hover:shadow-[0_0_30px_rgba(16,185,129,0.12)] transition-all duration-300 block"
              >
                <div className="h-40 bg-gradient-to-br from-emerald-600/30 to-teal-600/20 relative overflow-hidden">
                  {service.imageUrl ? (
                    <Image src={service.imageUrl} alt={service.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-6xl opacity-15">🥗</div>
                    </div>
                  )}
                  <div className="absolute bottom-4 left-4 flex gap-2">
                    <span className="badge badge-emerald text-xs shadow-lg">{fDZD(service.price)}</span>
                    <span className="badge bg-emerald-500/20 text-emerald-400 text-xs shadow-lg">{t("nav.nutrition")}</span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors line-clamp-1">{service.title}</h3>
                  <p className="text-slate-400 text-sm mb-4 line-clamp-2">{service.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      {expertPhoto ? (
                        <Image src={expertPhoto} alt={expertName} width={32} height={32} className="w-8 h-8 rounded-full object-cover border border-emerald-500/30 flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-xs font-bold text-black flex-shrink-0">
                          {expertName[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs text-white font-semibold truncate">{expertName}</p>
                        <StarRating rating={service.averageRating ?? 0} reviewCount={service.reviewCount ?? 0} size={11} />
                      </div>
                    </div>
                    <span className="text-emerald-400 text-sm font-semibold flex-shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">{t("marketplace.view")}</span>
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
