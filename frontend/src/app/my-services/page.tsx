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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [savingEdit, setSavingEdit] = useState(false);

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

  const startEdit = (s: MyService) => {
    setEditingId(s.id);
    setEditForm({
      title: s.title,
      description: s.description,
      price: s.price,
      imageUrl: s.imageUrl || "",
      category: s.category || "NUTRITION",
      sportId: s.sportId || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleEditSave = async (id: string) => {
    setSavingEdit(true);
    try {
      await serviceAPI.update(id, editForm);
      setMsg("Service updated!");
      setEditingId(null);
      setEditForm({});
      loadServices();
    } catch (err: unknown) {
      setMsg((err as Error).message);
    } finally {
      setSavingEdit(false);
    }
  };

  const categoryColor = (cat: string) =>
    cat === "SPORTS"
      ? { bg: "from-amber-500/20 to-orange-500/10", glow: "group-hover:shadow-[0_10px_40px_-10px_rgba(245,158,11,0.3)]", badge: "bg-amber-500/20 text-amber-400 border border-amber-500/30", icon: "🏋️", hover: "hover:border-amber-500/50" }
      : { bg: "from-emerald-500/20 to-teal-500/10", glow: "group-hover:shadow-[0_10px_40px_-10px_rgba(16,185,129,0.3)]", badge: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30", icon: "🥗", hover: "hover:border-emerald-500/50" };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 relative">
      {/* Ambient BG Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-emerald-500/10 blur-[150px] rounded-full pointer-events-none -z-10" />

      {/* Header */}
      <div className="bg-slate-900/60 backdrop-blur-3xl p-8 sm:p-10 animate-fade-up rounded-[2.5rem] border border-white/10 mb-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Link href="/" className="text-xs font-bold text-slate-500 hover:text-emerald-400 transition-colors tracking-widest uppercase">{t("nav.home")}</Link>
              <span className="text-slate-500">/</span>
              <span className="text-xs font-bold text-white tracking-widest uppercase">{t("myServices.title")}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 flex items-center gap-4 drop-shadow-md">
              <span>🏷️</span> {t("myServices.title")}
            </h1>
            <p className="text-slate-400 text-sm md:text-base mt-2 font-medium">{t("myServices.subtitle")}</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className={`px-6 py-3.5 rounded-2xl font-black text-sm transition-all active:scale-95 shadow-lg flex items-center gap-2 ${showForm ? "bg-white/10 text-white hover:bg-white/20 border border-white/10" : "bg-gradient-to-r from-emerald-500 to-cyan-500 text-black hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] hover:scale-[1.02]"}`}>
            {showForm ? (
              <><span>✕</span> {t("common.cancel")}</>
            ) : (
              <><span>✨</span> {t("services.newService")}</>
            )}
          </button>
        </div>
      </div>

      {msg && (
        <div className={`mb-8 p-4 rounded-2xl text-sm font-bold animate-in slide-in-from-top-4 flex items-center gap-3 ${msg.includes("created") || msg.includes("updated") ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]" : "bg-red-500/10 border border-red-500/30 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.15)]"}`}>
          <span className="text-xl">{msg.includes("created") || msg.includes("updated") ? "✅" : "⚠️"}</span>
          {msg}
        </div>
      )}

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 animate-fade-up-d1">
        {[
          { label: t("services.totalServices"), val: services.length, icon: "📊", color: "from-blue-500/20 to-indigo-500/5", border: "border-blue-500/30", text: "text-blue-400" },
          { label: "Sports Services", val: services.filter((s) => s.category === "SPORTS").length, icon: "🏋️", color: "from-amber-500/20 to-orange-500/5", border: "border-amber-500/30", text: "text-amber-400" },
          { label: "Nutrition Plans", val: services.filter((s) => s.category === "NUTRITION").length, icon: "🥗", color: "from-emerald-500/20 to-teal-500/5", border: "border-emerald-500/30", text: "text-emerald-400" },
        ].map((stat, i) => (
          <div key={i} className={`bg-gradient-to-br ${stat.color} border ${stat.border} p-6 rounded-3xl relative overflow-hidden backdrop-blur-md flex items-center gap-5 shadow-lg`}>
            <div className={`w-14 h-14 rounded-2xl bg-black/20 flex items-center justify-center text-3xl border border-white/10 shrink-0`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-3xl font-black text-white leading-none tracking-tight">{stat.val}</p>
              <p className={`text-[11px] font-extrabold uppercase tracking-widest mt-1.5 ${stat.text}`}>{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-slate-900/80 backdrop-blur-2xl p-8 sm:p-10 mb-12 rounded-[2.5rem] border border-emerald-500/30 shadow-[0_20px_60px_-15px_rgba(16,185,129,0.2)] animate-in zoom-in-95 duration-300">
          <h3 className="text-2xl font-black text-white mb-8 flex items-center gap-3">
            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">✨</span> 
            {t("services.createTitle")}
          </h3>
          <form onSubmit={handleCreate} className="flex flex-col gap-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 mb-2 uppercase tracking-widest pl-1">{t("services.serviceTitle")}</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-black/40 border border-white/10 text-white rounded-2xl px-5 py-4 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all font-medium placeholder:text-slate-600 shadow-inner" placeholder={t("services.serviceTitlePlaceholder")} required />
              </div>
              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 mb-2 uppercase tracking-widest pl-1">{t("services.price")}</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">DZD</span>
                  <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full bg-black/40 border border-white/10 text-white rounded-2xl pl-16 pr-5 py-4 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all font-medium placeholder:text-slate-600 shadow-inner" placeholder="0.00" required />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-slate-400 mb-2 uppercase tracking-widest pl-1">{t("services.description")}</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-black/40 border border-white/10 text-white rounded-2xl px-5 py-4 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all font-medium placeholder:text-slate-600 shadow-inner min-h-[140px] resize-none" placeholder={t("myServices.descPlaceholder")} required />
            </div>

            <div className="grid lg:grid-cols-2 gap-8 bg-white/5 p-6 rounded-3xl border border-white/5">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 mb-3 uppercase tracking-widest pl-1">{t("services.category")}</label>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <button type="button" onClick={() => { setCategory("SPORTS"); setSportId(""); }} className={`py-4 rounded-2xl text-sm font-bold transition-all border active:scale-95 flex items-center justify-center gap-2 ${category === "SPORTS" ? "border-amber-500/50 bg-amber-500/20 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.2)]" : "border-white/10 bg-black/40 text-slate-400 hover:bg-white/10 hover:text-white"}`}>
                    <span className="text-xl">🏋️</span> {t("marketplace.sports")}
                  </button>
                  <button type="button" onClick={() => { setCategory("NUTRITION"); setSportId(""); }} className={`py-4 rounded-2xl text-sm font-bold transition-all border active:scale-95 flex items-center justify-center gap-2 ${category === "NUTRITION" ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.2)]" : "border-white/10 bg-black/40 text-slate-400 hover:bg-white/10 hover:text-white"}`}>
                    <span className="text-xl">🥗</span> {t("marketplace.nutrition")}
                  </button>
                </div>

                {category === "SPORTS" && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <label className="block text-[11px] font-extrabold text-slate-400 mb-3 uppercase tracking-widest pl-1">{t("services.sportType")}</label>
                    <div className="flex flex-wrap gap-2 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
                      {sports.map((s) => (
                        <button key={s.id} type="button" onClick={() => setSportId(sportId === s.id ? "" : s.id)}
                          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 ${sportId === s.id ? "border-amber-500/50 bg-amber-500/20 text-amber-300 shadow-md" : "border-white/10 bg-black/40 text-slate-400 hover:border-white/20 hover:text-white"}`}
                        >
                          <span className="text-base">{s.icon}</span>
                          <span>{locale === "ar" ? s.nameAr : s.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 mb-3 uppercase tracking-widest pl-1">{t("services.serviceImage")}</label>
                <div className="p-6 border-2 border-dashed border-white/10 rounded-3xl bg-black/20 text-center hover:bg-black/40 hover:border-emerald-500/30 transition-all group">
                  {imageUrl ? (
                    <div className="relative w-full h-40 rounded-2xl overflow-hidden border border-white/10 group">
                      <Image src={imageUrl} alt="" fill className="object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button type="button" onClick={() => setImageUrl("")} className="px-4 py-2 bg-red-500 text-white font-bold rounded-xl text-xs shadow-lg hover:scale-105 transition-all">Remove Image</button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6">
                      <div className="w-16 h-16 mx-auto rounded-full bg-white/5 flex items-center justify-center text-2xl mb-4 group-hover:bg-emerald-500/10 group-hover:text-emerald-400 transition-colors">📸</div>
                      <p className="text-sm font-medium text-slate-400 mb-4">Upload a high-quality cover image</p>
                      <button type="button" onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file"; input.accept = "image/*";
                        input.onchange = async (e: any) => {
                          const file = e.target?.files?.[0]; if (!file) return;
                          try { const res = await uploadAPI.uploadFile(file); setImageUrl(res.url); } catch {}
                        };
                        input.click();
                      }} className="px-6 py-2.5 rounded-xl bg-white/10 text-white font-bold text-xs hover:bg-white/20 transition-all border border-white/5 shadow-md">
                        Browse Files
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button type="submit" disabled={saving} className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-black text-lg shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none">
                {saving ? "Publishing..." : t("services.publish")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-slate-900/50 rounded-3xl overflow-hidden border border-white/5 animate-pulse">
              <div className="h-48 bg-white/5" />
              <div className="p-6 space-y-4">
                <div className="h-6 bg-white/5 rounded-md w-3/4" />
                <div className="h-4 bg-white/5 rounded-md w-full" />
                <div className="h-4 bg-white/5 rounded-md w-2/3" />
                <div className="pt-4 flex justify-between">
                  <div className="h-4 bg-white/5 rounded-md w-1/4" />
                  <div className="h-4 bg-white/5 rounded-md w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && services.length === 0 && (
        <div className="bg-slate-900/40 backdrop-blur-md p-16 rounded-[3rem] border border-white/10 text-center animate-fade-up shadow-2xl relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 rounded-3xl flex items-center justify-center text-5xl mb-6 shadow-inner relative z-10">🏷️</div>
          <h2 className="text-3xl font-black text-white mb-3 relative z-10">{t("myServices.noServices")}</h2>
          <p className="text-slate-400 mb-8 max-w-md mx-auto font-medium relative z-10">{t("myServices.noServicesDesc")}</p>
          <button onClick={() => setShowForm(true)} className="px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-black shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-95 transition-all relative z-10">
            {t("myServices.createService")}
          </button>
        </div>
      )}

      {/* Services Grid */}
      {!loading && services.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-up-d2">
          {services.map((svc) => {
            const cc = categoryColor(svc.category);
            
            // Edit Mode Card
            if (editingId === svc.id) {
              return (
                <div key={svc.id} className="bg-slate-900/90 backdrop-blur-2xl p-6 rounded-3xl border border-emerald-500/50 shadow-[0_10px_40px_-10px_rgba(16,185,129,0.3)] lg:col-span-2 xl:col-span-3 animate-in zoom-in-95 duration-200 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />
                  
                  <div className="flex items-center justify-between mb-6 relative z-10">
                    <h3 className="text-xl font-black text-white flex items-center gap-2"><span className="text-2xl">✏️</span> Edit Service</h3>
                    <button onClick={cancelEdit} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors">✕</button>
                  </div>
                  
                  <div className="grid lg:grid-cols-2 gap-8 relative z-10">
                    <div className="space-y-5">
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-400 mb-2 uppercase tracking-widest pl-1">Title</label>
                        <input value={editForm.title || ""} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="w-full bg-black/40 border border-white/10 text-white rounded-xl px-4 py-3 focus:border-emerald-500/50 outline-none text-sm font-medium" placeholder="Title" required />
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-400 mb-2 uppercase tracking-widest pl-1">Description</label>
                        <textarea value={editForm.description || ""} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="w-full bg-black/40 border border-white/10 text-white rounded-xl px-4 py-3 focus:border-emerald-500/50 outline-none text-sm font-medium min-h-[100px] resize-none" placeholder="Description" required />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 mb-2 uppercase tracking-widest pl-1">Price (DZD)</label>
                          <input type="number" value={editForm.price || ""} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} className="w-full bg-black/40 border border-white/10 text-white rounded-xl px-4 py-3 focus:border-emerald-500/50 outline-none text-sm font-medium" placeholder="Price" required />
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 mb-2 uppercase tracking-widest pl-1">Image URL</label>
                          <div className="flex gap-2">
                            <input value={editForm.imageUrl || ""} onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })} className="w-full bg-black/40 border border-white/10 text-white rounded-xl px-4 py-3 focus:border-emerald-500/50 outline-none text-xs font-medium" placeholder="Image URL" />
                            <button type="button" onClick={() => {
                              const input = document.createElement("input");
                              input.type = "file"; input.accept = "image/*";
                              input.onchange = async (e: any) => {
                                const file = e.target?.files?.[0]; if (!file) return;
                                try { const res = await uploadAPI.uploadFile(file); setEditForm({ ...editForm, imageUrl: res.url }); } catch {}
                              }; input.click();
                            }} className="px-3 bg-white/10 rounded-xl text-xs font-bold hover:bg-white/20 transition-colors">UP</button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-5 bg-white/5 p-5 rounded-2xl border border-white/5">
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-400 mb-3 uppercase tracking-widest pl-1">Category</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button type="button" onClick={() => setEditForm({ ...editForm, category: "NUTRITION", sportId: "" })} className={`py-3 rounded-xl text-sm font-bold transition-all border ${editForm.category === "NUTRITION" ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400" : "border-white/10 bg-black/30 text-slate-400"}`}>🥗 Nutrition</button>
                          <button type="button" onClick={() => setEditForm({ ...editForm, category: "SPORTS", sportId: "" })} className={`py-3 rounded-xl text-sm font-bold transition-all border ${editForm.category === "SPORTS" ? "border-amber-500/50 bg-amber-500/20 text-amber-400" : "border-white/10 bg-black/30 text-slate-400"}`}>🏋️ Sports</button>
                        </div>
                      </div>

                      {editForm.category === "SPORTS" && (
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 mb-2 uppercase tracking-widest pl-1">Sport Type</label>
                          <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                            {sports.map((sp) => (
                              <button key={sp.id} type="button" onClick={() => setEditForm({ ...editForm, sportId: editForm.sportId === sp.id ? "" : sp.id })}
                                className={`text-xs px-3 py-2 rounded-lg font-bold border transition-colors ${editForm.sportId === sp.id ? "border-amber-500/50 bg-amber-500/20 text-amber-300" : "border-white/10 bg-black/30 text-slate-400 hover:bg-white/10"}`}
                              >{sp.icon} {locale === "ar" ? sp.nameAr : sp.name}</button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end gap-3 relative z-10 border-t border-white/10 pt-6">
                    <button onClick={cancelEdit} className="px-6 py-3 rounded-xl text-slate-400 font-bold hover:text-white hover:bg-white/5 transition-colors text-sm">Cancel</button>
                    <button onClick={() => handleEditSave(svc.id)} disabled={savingEdit} className="px-8 py-3 rounded-xl bg-emerald-500 text-black font-black hover:bg-emerald-400 active:scale-95 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] text-sm disabled:opacity-50">
                      {savingEdit ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              );
            }

            // Normal Card
            return (
              <div key={svc.id} className={`group bg-slate-900/60 backdrop-blur-md rounded-[2rem] overflow-hidden border border-white/10 transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02] ${cc.hover} ${cc.glow} flex flex-col`}>
                
                {/* Image Header */}
                <div className={`h-56 relative overflow-hidden bg-gradient-to-br ${cc.bg}`}>
                  {svc.imageUrl ? (
                    <Image src={svc.imageUrl} alt={svc.title} fill className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-8xl opacity-20 transform group-hover:scale-125 group-hover:rotate-6 transition-all duration-700">{cc.icon}</div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent" />
                  
                  {/* Badges */}
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest backdrop-blur-md ${cc.badge}`}>
                      {cc.icon} {svc.category === "SPORTS" ? t("marketplace.sports") : t("marketplace.nutrition")}
                    </span>
                    {svc.sport && (
                      <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest backdrop-blur-md bg-white/10 border border-white/20 text-white shadow-md">
                        {svc.sport.icon} {locale === "ar" ? svc.sport.nameAr : svc.sport.name}
                      </span>
                    )}
                  </div>

                  {/* Actions (Hover) */}
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 translate-y-[-10px] group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                    <button onClick={() => startEdit(svc)} className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-sm shadow-xl hover:bg-emerald-500/80 hover:border-emerald-400 hover:text-white transition-all text-slate-200">
                      ✏️
                    </button>
                    <button onClick={() => handleDelete(svc.id)} className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-sm shadow-xl hover:bg-red-500/80 hover:border-red-400 hover:text-white transition-all text-slate-200">
                      ✕
                    </button>
                  </div>

                  {/* Price Plate */}
                  <div className="absolute bottom-5 left-6">
                    <span className="text-3xl font-black text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] tracking-tight">{fDZD(svc.price)}</span>
                    <span className="text-slate-300 text-xs font-bold uppercase tracking-widest ml-2 opacity-80">{t("myServices.perMonth")}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-xl font-bold text-white mb-3 line-clamp-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-400 transition-colors">{svc.title}</h3>
                  <p className="text-slate-400 text-sm mb-6 line-clamp-2 leading-relaxed font-medium">{svc.description}</p>

                  {/* Stats Footer */}
                  <div className="mt-auto flex items-center justify-between pt-5 border-t border-white/5">
                    <div className="flex items-center gap-5">
                      <span className="flex items-center gap-2 text-xs font-bold text-slate-400 group-hover:text-slate-300 transition-colors">
                        <span className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center border border-white/5">📦</span>
                        {svc._count.orders} <span className="hidden sm:inline uppercase tracking-widest text-[9px] opacity-70">Orders</span>
                      </span>
                      <span className="flex items-center gap-2 text-xs font-bold text-slate-400 group-hover:text-slate-300 transition-colors">
                        <span className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center border border-white/5">⭐</span>
                        {svc._count.reviews} <span className="hidden sm:inline uppercase tracking-widest text-[9px] opacity-70">Reviews</span>
                      </span>
                    </div>
                    <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-widest">{new Date(svc.createdAt).toLocaleDateString()}</span>
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
