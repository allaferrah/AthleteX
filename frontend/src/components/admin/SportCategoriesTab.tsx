"use client";

import { useEffect, useState } from "react";
import { sportCategoryAPI, uploadAPI } from "@/lib/api";
import { useLocale } from "@/i18n/LocaleContext";
import Image from "next/image";

interface SportCat {
  id: string; name: string; nameAr: string; icon: string; imageUrl: string | null;
  description: string; descriptionAr: string; sortOrder: number;
  _count: { services: number };
}

const initialForm = { name: "", nameAr: "", icon: "", imageUrl: "", description: "", descriptionAr: "", sortOrder: 0 };

export default function SportCategoriesTab({ searchQuery = "" }: { searchQuery?: string }) {
  const { t } = useLocale();
  const [sports, setSports] = useState<SportCat[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [showAdd, setShowAdd] = useState(false);

  const load = () => { sportCategoryAPI.getAll().then(setSports).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const resetForm = () => setForm(initialForm);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg("");
    try { await sportCategoryAPI.create(form); setMsg(t("admin.sportCreated")); setShowAdd(false); resetForm(); load(); }
    catch (err: unknown) { setMsg((err as Error).message); }
  };

  const handleUpdate = async (id: string) => {
    setMsg("");
    try { await sportCategoryAPI.update(id, form); setMsg(t("admin.sportSaved")); setEditing(null); resetForm(); load(); }
    catch (err: unknown) { setMsg((err as Error).message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("admin.confirmDeleteSport"))) return; setMsg("");
    try { await sportCategoryAPI.delete(id); setMsg(t("admin.sportDeleted")); load(); }
    catch (err: unknown) {
      const m = (err as Error).message;
      if (m.includes("linked") || m.includes("service")) setMsg(t("admin.sportDeleteError"));
      else setMsg(m);
    }
  };

  const startEdit = (s: SportCat) => {
    setEditing(s.id); setForm({ name: s.name, nameAr: s.nameAr, icon: s.icon, imageUrl: s.imageUrl || "", description: s.description, descriptionAr: s.descriptionAr, sortOrder: s.sortOrder });
  };

  const handleUpload = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;
      try { const res = await uploadAPI.uploadFile(file); setForm({ ...form, imageUrl: res.url }); } catch {}
    };
    input.click();
  };

  const q = searchQuery.toLowerCase();
  const filtered = sports.filter((s) =>
    !q ||
    s.name.toLowerCase().includes(q) ||
    s.nameAr.toLowerCase().includes(q)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">{t("admin.sportsCategories")} {searchQuery ? <span className="text-sm font-normal text-slate-500">({filtered.length} of {sports.length})</span> : <span>({sports.length})</span>}</h2>
        <button onClick={() => { setShowAdd(!showAdd); resetForm(); setEditing(null); }} className="btn-primary !py-2 !px-5 text-sm">
          <span>{showAdd ? t("common.cancel") : "+ " + t("admin.addSport")}</span>
        </button>
      </div>

      {msg && <div className={`p-3 glass-sm text-sm rounded-lg ${msg.includes("deleted") || msg.includes("error") || msg.includes("Cannot") ? "border border-red-500/20 text-red-400" : "border border-emerald-500/20 text-emerald-400"}`}>{msg}</div>}

      {(showAdd || editing) && (
        <div className="glass-card-premium p-6 border border-amber-500/10">
          <h3 className="text-sm font-bold text-white mb-4">{editing ? t("admin.editSport") : t("admin.addSport")}</h3>
          <form onSubmit={(e) => { e.preventDefault(); editing ? handleUpdate(editing) : handleCreate(e); }} className="grid md:grid-cols-2 gap-4">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" placeholder={t("admin.sportName")} required />
            <input value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} className="input-field" placeholder={t("admin.sportNameAr")} required />
            <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className="input-field" placeholder={t("admin.sportIcon") + " (e.g. ⚽)"} required />
            <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} className="input-field" placeholder={t("admin.sortOrder")} />
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">{t("admin.sportImage")}</label>
              <div className="flex gap-2">
                <input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className="input-field flex-1 text-sm" placeholder="https://..." />
                <button type="button" onClick={handleUpload} className="btn-ghost !py-1.5 !px-3 text-xs">{t("myServices.browse")}</button>
              </div>
              {form.imageUrl && <Image src={form.imageUrl} alt="" width={96} height={64} className="w-24 h-16 mt-2 rounded-lg object-cover border border-white/5" />}
            </div>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field md:col-span-2" placeholder={t("admin.sportDescription")} required />
            <input value={form.descriptionAr} onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })} className="input-field md:col-span-2" placeholder={t("admin.sportDescriptionAr")} required />
            <button type="submit" className="btn-primary col-span-full"><span>{editing ? t("common.save") : t("admin.addSport")}</span></button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-slate-800/40 animate-pulse" />)}</div>
      ) : sports.length === 0 ? (
        <div className="glass-card-premium p-12 text-center"><p className="text-slate-400">{t("admin.noSports")}</p></div>
      ) : (
        <div className="glass-card-premium overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="p-3 sm:p-4">{t("admin.sportImage")}</th>
                  <th className="p-3 sm:p-4">{t("admin.sport")}</th>
                  <th className="p-3 sm:p-4">{t("admin.sportNameAr")}</th>
                  <th className="p-3 sm:p-4">{t("admin.sortOrder")}</th>
                  <th className="p-3 sm:p-4">{t("admin.sportServicesCount")}</th>
                  <th className="p-3 sm:p-4">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="p-12 text-center text-slate-500">No results for &apos;{searchQuery}&apos;</td></tr>
                ) : (
                  filtered.map((s) => (
                    <tr key={s.id} className="border-b border-white/[0.03] hover:bg-white/5 transition-colors">
                      <td className="p-3 sm:p-4">
                        {s.imageUrl
                          ? <Image src={s.imageUrl} alt={s.name} width={40} height={40} className="w-10 h-10 rounded-lg object-cover border border-white/80 flex-shrink-0" />
                          : <span className="text-2xl">{s.icon}</span>}
                      </td>
                      <td className="p-3 sm:p-4 text-sm font-semibold text-white truncate max-w-[100px] sm:max-w-[200px]">{s.name}</td>
                      <td className="p-3 sm:p-4 text-sm text-slate-300 truncate max-w-[100px] sm:max-w-[200px]">{s.nameAr}</td>
                      <td className="p-3 sm:p-4 text-sm text-slate-400">{s.sortOrder}</td>
                      <td className="p-3 sm:p-4 text-sm text-slate-400">{s._count.services}</td>
                      <td className="p-3 sm:p-4">
                        <div className="flex gap-2">
                          <button onClick={() => startEdit(s)} className="text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 px-3 py-1.5 rounded-lg font-semibold transition">{t("admin.editSport")}</button>
                          <button onClick={() => handleDelete(s.id)} className="text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 px-3 py-1.5 rounded-lg font-semibold transition">{t("admin.deleteSport")}</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
