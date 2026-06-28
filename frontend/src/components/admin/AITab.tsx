"use client";

import { useEffect, useState } from "react";
import { adminAPI } from "@/lib/api";
import { useLocale } from "@/i18n/LocaleContext";
import { fDZD } from "@/lib/format";

export default function AITab({ searchQuery = "" }: { searchQuery?: string }) {
  const { t } = useLocale();
  const [config, setConfig] = useState<{ creditPrice: number; freeGenerations: number } | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [creditPrice, setCreditPrice] = useState("");
  const [freeGen, setFreeGen] = useState("");

  const load = async () => {
    try {
      const [cfg, usrs] = await Promise.all([adminAPI.getAIConfig(), adminAPI.getAIUsers()]);
      setConfig(cfg);
      setCreditPrice(String(cfg.creditPrice ?? 500));
      setFreeGen(String(cfg.freeGenerations ?? 3));
      setUsers(usrs);
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setSaving(true); setMsg("");
    try {
      await adminAPI.updateAIConfig({ creditPrice: parseInt(creditPrice) || 500, freeGenerations: parseInt(freeGen) || 3 });
      setMsg("saved"); load();
    } catch { setMsg("error"); }
    setSaving(false);
  };

  const q = searchQuery.toLowerCase();
  const filteredUsers = users.filter((u: any) =>
    !q ||
    (u.fullName || u.email || "").toLowerCase().includes(q) ||
    (u.email || "").toLowerCase().includes(q)
  );

  if (loading) {
    return <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{[1, 2].map((i) => <div key={i} className="h-48 rounded-xl bg-slate-800/40 animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-8">
      <div className="glass-card-premium p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-white">{t("admin.aiConfig")}</h2>
            <p className="text-slate-400 text-sm">{t("admin.configSaved")}</p>
          </div>
        </div>

        {msg === "saved" && <div className="mb-4 p-3 glass-sm rounded-lg border border-emerald-500/20 text-emerald-400 text-sm">{t("admin.configSaved")}</div>}
        {msg === "error" && <div className="mb-4 p-3 glass-sm rounded-lg border border-red-500/20 text-red-400 text-sm">{t("common.error")}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm text-slate-400 mb-1">{t("admin.creditPrice")}</label>
            <input type="number" value={creditPrice} onChange={(e) => setCreditPrice(e.target.value)}
              className="w-full bg-slate-800/60 border border-white/80 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500/50" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">{t("admin.freeGenerations")}</label>
            <input type="number" value={freeGen} onChange={(e) => setFreeGen(e.target.value)}
              className="w-full bg-slate-800/60 border border-white/80 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500/50" />
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-full text-sm font-bold hover:from-emerald-400 hover:to-emerald-500 transition-all disabled:opacity-50">
          {saving ? "..." : t("common.save")}
        </button>
      </div>

      <div className="glass-card-premium overflow-hidden">
        <div className="p-6 pb-0">
          <h2 className="text-lg font-bold text-white">{t("admin.aiUsers")} {searchQuery ? <span className="text-sm font-normal text-slate-500">({filteredUsers.length} of {users.length})</span> : null}</h2>
        </div>
        {users.length === 0 ? (
          <div className="p-12 text-center"><p className="text-slate-400">{t("common.noData")}</p></div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="p-4">{t("admin.client")}</th>
                  <th className="p-4">{t("admin.usedGenerations")}</th>
                  <th className="p-4">{t("admin.freeGenerations")}</th>
                  <th className="p-4">{t("admin.creditBalance")}</th>
                  <th className="p-4">{t("admin.totalSpent")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr><td colSpan={5} className="p-12 text-center text-slate-500">No results for &apos;{searchQuery}&apos;</td></tr>
                ) : (
                  filteredUsers.map((u: any) => (
                    <tr key={u.id} className="border-b border-white/[0.03] hover:bg-white/5 transition-colors">
                      <td className="p-4 text-sm text-slate-300">{u.fullName || u.email}</td>
                      <td className="p-4 text-sm text-white">{u.aiGenerationsUsed ?? 0}</td>
                      <td className="p-4 text-sm text-slate-400">{u.aiGenerationsLimit ?? config?.freeGenerations ?? 3}</td>
                      <td className="p-4 text-sm font-semibold text-emerald-400">{u.aiCreditBalance ?? 0}</td>
                      <td className="p-4 text-sm font-semibold text-amber-400">{fDZD(u.totalSpent ?? 0)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
