"use client";

import { useState } from "react";
import { adminAPI } from "@/lib/api";
import { useLocale } from "@/i18n/LocaleContext";
import { useAdminData } from "./AdminDataContext";
import Image from "next/image";

export default function UsersTab({ searchQuery = "" }: { searchQuery?: string }) {
  const { t } = useLocale();
  const { data, loading, refresh } = useAdminData();
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newName, setNewName] = useState("");
  const [newSpec, setNewSpec] = useState("");
  const [msg, setMsg] = useState("");

  const users = data.users;

  const handleRoleChange = async (id: string, role: string) => {
    try { await adminAPI.updateUserRole(id, role); refresh(); } catch {}
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this user?")) return;
    try { await adminAPI.deleteUser(id); refresh(); } catch (err: unknown) { setMsg((err as Error).message); }
  };

  const handleCreateExpert = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg("");
    try {
      await adminAPI.createExpert(newEmail, newPass, newName || undefined, newSpec || undefined);
      setMsg("Expert created!"); setNewEmail(""); setNewPass(""); setNewName(""); setNewSpec("");
      setShowCreate(false); refresh();
    } catch (err: unknown) { setMsg((err as Error).message); }
  };

  const roleColor = (r: string) => r === "ADMIN" ? "badge-red" : r === "EXPERT" ? "badge-blue" : "badge-emerald";

  const q = searchQuery.toLowerCase();
  const filtered = users.filter((u: any) =>
    !q ||
    u.email.toLowerCase().includes(q) ||
    (u.profile?.fullName?.toLowerCase() || "").includes(q) ||
    (u.profile?.specialization?.toLowerCase() || "").includes(q) ||
    u.role.toLowerCase().includes(q)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">{t("admin.allUsers")} {searchQuery && <span className="text-sm font-normal text-slate-500">({filtered.length} of {users.length})</span>}</h2>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary !py-2 !px-5 text-sm">
          <span>{showCreate ? t("common.cancel") : "+ " + t("admin.createExpert")}</span>
        </button>
      </div>

      {msg && <div className={`p-3 glass-sm text-sm rounded-lg ${msg.includes("created") ? "border border-emerald-500/20 text-emerald-400" : "border border-red-500/20 text-red-400"}`}>{msg}</div>}

      {showCreate && (
        <div className="glass-card-premium p-6 border border-blue-500/10">
          <h3 className="text-sm font-bold text-white mb-4">{t("admin.createExpertForm")}</h3>
          <form onSubmit={handleCreateExpert} className="grid md:grid-cols-2 gap-4">
            <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="input-field" placeholder="Email" required />
            <input value={newPass} onChange={(e) => setNewPass(e.target.value)} className="input-field" placeholder="Password" required type="password" />
            <input value={newName} onChange={(e) => setNewName(e.target.value)} className="input-field" placeholder="Full Name (optional)" />
            <input value={newSpec} onChange={(e) => setNewSpec(e.target.value)} className="input-field" placeholder="Specialization (optional)" />
            <button type="submit" className="btn-primary col-span-full"><span>{t("admin.createExpert")}</span></button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-slate-800/40 animate-pulse" />)}</div>
      ) : (
        <div className="glass-card-premium overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="p-3 sm:p-4">{t("admin.user")}</th>
                  <th className="p-3 sm:p-4">{t("admin.role")}</th>
                  <th className="p-3 sm:p-4">{t("admin.servicesCount")}</th>
                  <th className="p-3 sm:p-4">{t("admin.ordersCount")}</th>
                  <th className="p-3 sm:p-4">{t("admin.joined")}</th>
                  <th className="p-3 sm:p-4">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="p-6 sm:p-12 text-center text-slate-500">No results for &apos;{searchQuery}&apos;</td></tr>
                ) : (
                  filtered.map((u: any) => (
                    <tr key={u.id} className="border-b border-white/[0.03] hover:bg-white/5 transition-colors">
                      <td className="p-3 sm:p-4">
                        <div className="flex items-center gap-3">
                          {u.profile?.photoUrl
                            ? <Image src={u.profile.photoUrl} alt="" width={32} height={32} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                            : <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-xs font-bold text-slate-800 flex-shrink-0">{u.email[0].toUpperCase()}</div>}
                          <div className="min-w-0"><p className="text-sm font-semibold text-white truncate max-w-[100px] sm:max-w-[200px]">{u.profile?.fullName || u.email}</p><p className="text-xs text-slate-500 truncate max-w-[100px] sm:max-w-[200px]">{u.email}</p></div>
                        </div>
                      </td>
                      <td className="p-3 sm:p-4"><span className={`badge text-xs ${roleColor(u.role)}`}>{u.role}</span></td>
                      <td className="p-3 sm:p-4 text-sm text-slate-400">{u._count.services}</td>
                      <td className="p-3 sm:p-4 text-sm text-slate-400">{u._count.orders}</td>
                      <td className="p-3 sm:p-4 text-sm text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="p-3 sm:p-4">
                        <div className="flex gap-2">
                          {u.role !== "ADMIN" && (
                            <select value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              className="bg-slate-800 text-xs text-slate-300 border border-white/80 rounded-lg px-2 py-1 outline-none focus:border-emerald-500">
                              <option value="USER">USER</option><option value="EXPERT">EXPERT</option>
                            </select>
                          )}
                          {u.role !== "ADMIN" && (
                            <button onClick={() => handleDelete(u.id)} className="text-xs text-red-400 hover:text-red-300 px-2 py-1">✕</button>
                          )}
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
