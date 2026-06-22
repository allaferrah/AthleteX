"use client";

import { useEffect, useState } from "react";
import { serviceAPI, uploadAPI, sportCategoryAPI } from "@/lib/api";
import { getUser, isLoggedIn } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { fDZD } from "@/lib/format";
import { useLocale } from "@/i18n/LocaleContext";
import Link from "next/link";
import Image from "next/image";

interface MySport {
  id: string; name: string; nameAr: string; icon: string;
}
interface MyService {
  id: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string | null;
  category: string;
  sportId: string | null;
  sport: MySport | null;
  createdAt: string;
  _count: { orders: number; reviews: number };
}

export default function MyServices() {
  const router = useRouter();
  const user = getUser();
  const { t, locale } = useLocale();
  const [services, setServices] = useState<MyService[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState("NUTRITION");
  const [sportId, setSportId] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [sports, setSports] = useState<{ id: string; name: string; nameAr: string; icon: string; description: string; sortOrder: number; _count?: { services: number } }[]>([]);

  useEffect(() => {
    if (!isLoggedIn() || user?.role !== "EXPERT") {
      router.push("/login");
      return;
    }
    loadServices();
    sportCategoryAPI.getAll().then(setSports).catch(() => {});
  }, []);

  const loadServices = async () => {
    try {
      const data = await serviceAPI.getMyServices();
      setServices(data);
    } catch {}
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      await serviceAPI.create(title, description, Number(price), imageUrl || undefined, category, sportId || undefined);
      setMsg("Service created!");
      setTitle(""); setDescription(""); setPrice(""); setImageUrl(""); setCategory("NUTRITION"); setSportId("");
      setShowForm(false);
      loadServices();
    } catch (err: unknown) {
      setMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this service?")) return;
    try {
      await serviceAPI.delete(id);
      loadServices();
    } catch {}
  };

  const categoryColor = (cat: string) =>
    cat === "SPORTS"
      ? { bg: "from-amber-500/20 to-orange-500/10", badge: "bg-amber-500/20 text-amber-400", icon: "🏋️", hover: "hover:border-amber-500/30" }
      : { bg: "from-emerald-500/20 to-teal-500/10", badge: "bg-emerald-500/20 text-emerald-400", icon: "🥗", hover: "hover:border-emerald-500/30" };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 animate-fade-up">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/" className="text-sm text-slate-500 hover:text-emerald-400 transition-colors">{t("nav.home")}</Link>
            <span className="text-slate-600">/</span>
            <span className="text-sm text-white font-semibold">{t("myServices.title")}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3">
            <span>🏷️</span> {t("myServices.title")}
          </h1>
          <p className="text-slate-400 text-sm mt-1">{t("myServices.subtitle")}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary !py-2.5 !px-6 text-sm">
          <span>{showForm ? t("common.cancel") : t("services.newService")}</span>
        </button>
      </div>

      {msg && (
        <div className={`mb-6 p-4 rounded-xl text-sm animate-fade-up ${msg.includes("created") || msg.includes("success") ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border border-red-500/20 text-red-400"}`}>
          {msg}
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div className="glass p-8 mb-10 border border-emerald-500/10 animate-fade-up">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">✨ {t("services.createTitle")}</h3>
          <form onSubmit={handleCreate} className="flex flex-col gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">{t("services.serviceTitle")}</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="input-field" placeholder={t("services.serviceTitlePlaceholder")} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">{t("services.description")}</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-field min-h-[120px] resize-none" placeholder={t("myServices.descPlaceholder")} required />
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">{t("services.category")}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => { setCategory("SPORTS"); setSportId(""); }} className={`p-3 rounded-xl text-sm font-semibold transition-all border ${category === "SPORTS" ? "border-amber-500 bg-amber-500/10 text-amber-400" : "border-white/5 bg-white/[0.02] text-slate-400 hover:border-white/10"}`}>
                    🏋️ {t("marketplace.sports")}
                  </button>
                  <button type="button" onClick={() => { setCategory("NUTRITION"); setSportId(""); }} className={`p-3 rounded-xl text-sm font-semibold transition-all border ${category === "NUTRITION" ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-white/5 bg-white/[0.02] text-slate-400 hover:border-white/10"}`}>
                    🥗 {t("marketplace.nutrition")}
                  </button>
                </div>
                {category === "SPORTS" && (
                  <div className="mt-3">
                    <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">{t("services.sportType")}</label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                      {sports.map((s) => (
                        <button key={s.id} type="button" onClick={() => setSportId(sportId === s.id ? "" : s.id)}
                          className={`flex flex-col items-center justify-center p-2 rounded-lg text-xs font-semibold transition-all border ${sportId === s.id ? "border-amber-500 bg-amber-500/20 text-amber-400" : "border-white/5 bg-white/[0.02] text-slate-400 hover:border-white/10 hover:text-white"}`}
                        >
                          <span className="text-lg">{s.icon}</span>
                          <span className="mt-0.5 leading-tight text-center">{locale === "ar" ? s.nameAr : s.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">{t("services.price")}</label>
                <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="input-field" placeholder="49" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">{t("services.serviceImage")}</label>
                <div className="flex gap-2">
                  <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="input-field flex-1 text-sm" placeholder={t("myServices.imagePlaceholder")} />
                  <button type="button" onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/*";
                    input.onchange = async (e: any) => {
                      const file = e.target?.files?.[0];
                      if (!file) return;
                      try {
                        const res = await uploadAPI.uploadFile(file);
                        setImageUrl(res.url);
                      } catch {}
                    };
                    input.click();
                  }} className="btn-ghost !py-1.5 !px-3 text-xs">{t("myServices.browse")}</button>
                </div>
                {imageUrl && <Image src={imageUrl} alt="" width={80} height={56} className="w-20 h-14 mt-2 rounded-lg object-cover border border-white/5" />}
              </div>
            </div>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
              <span>{saving ? t("services.creating") : t("services.publish")}</span>
            </button>
          </form>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8 animate-fade-up-d1">
        <div className="glass p-5 border-t-2 border-t-emerald-500">
          <p className="text-2xl font-black text-white">{services.length}</p>
          <p className="text-xs text-slate-500 mt-1">{t("services.totalServices")}</p>
        </div>
        <div className="glass p-5 border-t-2 border-t-amber-500">
          <p className="text-2xl font-black text-white">{services.filter((s) => s.category === "SPORTS").length}</p>
          <p className="text-xs text-slate-500 mt-1">🏋️ Sports</p>
        </div>
        <div className="glass p-5 border-t-2 border-t-emerald-500">
          <p className="text-2xl font-black text-white">{services.filter((s) => s.category === "NUTRITION").length}</p>
          <p className="text-xs text-slate-500 mt-1">🥗 Nutrition</p>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="glass overflow-hidden animate-pulse">
              <div className="h-44 bg-slate-800/60" />
              <div className="p-6 space-y-3">
                <div className="h-5 bg-slate-800/60 rounded w-3/4" />
                <div className="h-4 bg-slate-800/40 rounded w-full" />
                <div className="h-4 bg-slate-800/40 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && services.length === 0 && (
        <div className="glass p-16 text-center animate-fade-up">
          <div className="text-6xl mb-4 opacity-60">🏷️</div>
          <h2 className="text-2xl font-bold text-white mb-2">{t("myServices.noServices")}</h2>
          <p className="text-slate-400 mb-6">{t("myServices.noServicesDesc")}</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <span>{t("myServices.createService")}</span>
          </button>
        </div>
      )}

      {/* Services Grid */}
      {!loading && services.length > 0 && (
        <div className="grid md:grid-cols-2 gap-6 animate-fade-up-d2">
          {services.map((svc) => {
            const cc = categoryColor(svc.category);
            return (
              <div key={svc.id} className={`glass overflow-hidden border border-transparent ${cc.hover} transition-all duration-300 group`}>
                {/* Image header */}
                <div className={`h-44 bg-gradient-to-br ${cc.bg} relative overflow-hidden`}>
                  {svc.imageUrl ? (
                    <Image src={svc.imageUrl} alt={svc.title} fill className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-7xl opacity-15">{cc.icon}</div>
                    </div>
                  )}
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className={`badge text-xs ${cc.badge}`}>{cc.icon} {svc.category === "SPORTS" ? t("marketplace.sports") : t("marketplace.nutrition")}</span>
                    {svc.sport && (
                      <span className="badge text-xs bg-white/10 text-white/80">{svc.sport.icon} {locale === "ar" ? svc.sport.nameAr : svc.sport.name}</span>
                    )}
                  </div>
                  <div className="absolute top-4 right-4">
                    <button onClick={() => handleDelete(svc.id)} className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-xs text-red-400 hover:bg-red-500/30 transition-all opacity-0 group-hover:opacity-100">
                      ✕
                    </button>
                  </div>
                  <div className="absolute bottom-4 left-4">
                    <span className="text-2xl font-black text-white drop-shadow-lg">{fDZD(svc.price)}</span>
                    <span className="text-slate-300 text-xs ml-1">{t("myServices.perMonth")}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-lg font-bold text-white mb-2 line-clamp-1">{svc.title}</h3>
                  <p className="text-slate-400 text-sm mb-5 line-clamp-2">{svc.description}</p>

                  {/* Stats row */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {svc._count.orders} {t("myServices.orders")}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                        {svc._count.reviews} {t("myServices.reviews")}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">{new Date(svc.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
