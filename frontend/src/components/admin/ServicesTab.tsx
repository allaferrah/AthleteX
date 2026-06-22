"use client";

import { useState } from "react";
import { adminAPI } from "@/lib/api";
import { useLocale } from "@/i18n/LocaleContext";
import { useAdminData } from "./AdminDataContext";
import { fDZD } from "@/lib/format";
import Image from "next/image";

export default function ServicesTab({ searchQuery = "" }: { searchQuery?: string }) {
  const { t } = useLocale();
  const { data, loading, refresh } = useAdminData();
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", price: 0, category: "" });

  const services = data.services;

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this service? This will also remove all related orders and reviews.")) return;
    try { await adminAPI.deleteService(id); setMsg("Service deleted"); refresh(); }
    catch (err: unknown) { setMsg((err as Error).message); }
  };

  const startEdit = (s: any) => {
    setEditing(s.id);
    setEditForm({ title: s.title, description: s.description || "", price: s.price, category: s.category || "NUTRITION" });
    setMsg("");
  };

  const handleUpdate = async (id: string) => {
    try {
      await adminAPI.updateService(id, editForm);
      setMsg("Service updated"); setEditing(null); refresh();
    } catch (err: unknown) { setMsg((err as Error).message); }
  };

  const q = searchQuery.toLowerCase();
  const filtered = services.filter((s: any) =>
    !q ||
    s.title.toLowerCase().includes(q) ||
    (s.expert?.profile?.fullName?.toLowerCase() || "").includes(q) ||
    (s.expert?.email?.toLowerCase() || "").includes(q) ||
    (s.category || "").toLowerCase().includes(q)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">{t("admin.allServices")} {searchQuery ? <span className="text-sm font-normal text-slate-500">({filtered.length} of {services.length})</span> : <span>({services.length})</span>}</h2>
      </div>

      {msg && (
        <div className={`p-3 glass-sm text-sm rounded-lg ${
          msg.includes("deleted") || msg.includes("updated")
            ? "border border-emerald-500/20 text-emerald-400"
            : "border border-red-500/20 text-red-400"
        }`}>{msg}</div>
      )}

      {editing && (
        <div className="glass-card-premium p-6 border border-blue-500/10">
          <h3 className="text-sm font-bold text-white mb-4">Edit Service</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              className="input-field" placeholder="Title" required />
            <input type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })}
              className="input-field" placeholder="Price" required />
            <select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
              className="input-field">
              <option value="NUTRITION">NUTRITION</option>
              <option value="SPORTS">SPORTS</option>
            </select>
            <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className="input-field md:col-span-2" placeholder="Description" rows={3} />
            <div className="md:col-span-2 flex gap-2">
              <button onClick={() => handleUpdate(editing)}
                className="btn-primary !py-2 !px-5 text-sm"><span>Save</span></button>
              <button onClick={() => setEditing(null)}
                className="btn-ghost !py-2 !px-5 text-sm">{t("common.cancel")}</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-slate-800/40 animate-pulse" />)}</div>
      ) : services.length === 0 ? (
        <div className="glass-card-premium p-12 text-center"><p className="text-slate-400">{t("admin.noServices")}</p></div>
      ) : (
        <div className="glass-card-premium overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="p-4">{t("admin.service")}</th>
                  <th className="p-4">{t("admin.expert")}</th>
                  <th className="p-4">{t("admin.category")}</th>
                  <th className="p-4">{t("admin.price")}</th>
                  <th className="p-4">{t("admin.ordersCount")}</th>
                  <th className="p-4">{t("admin.created")}</th>
                  <th className="p-4">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="p-12 text-center text-slate-500">No results for &apos;{searchQuery}&apos;</td></tr>
                ) : (
                  filtered.map((s: any) => (
                    <tr key={s.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {s.imageUrl && <Image src={s.imageUrl} alt="" width={40} height={40} className="w-10 h-10 rounded-lg object-cover" />}
                          <span className="text-sm font-semibold text-white">{s.title}</span>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-slate-300">{s.expert?.profile?.fullName || s.expert?.email}</td>
                      <td className="p-4"><span className={`badge text-xs ${s.category === "SPORTS" ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"}`}>{s.category || "NUTRITION"}</span></td>
                      <td className="p-4 text-sm font-bold text-emerald-400">{fDZD(s.price)}</td>
                      <td className="p-4 text-sm text-slate-400">{s._count.orders}</td>
                      <td className="p-4 text-sm text-slate-500">{new Date(s.createdAt).toLocaleDateString()}</td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button onClick={() => startEdit(s)}
                            className="text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 px-3 py-1.5 rounded-lg font-semibold transition">{t("admin.edit")}</button>
                          <button onClick={() => handleDelete(s.id)}
                            className="text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 px-3 py-1.5 rounded-lg font-semibold transition">{t("admin.delete")}</button>
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
