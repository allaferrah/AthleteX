"use client";

import { useEffect, useState } from "react";
import { adminAPI } from "@/lib/api";
import { useLocale } from "@/i18n/LocaleContext";
import Image from "next/image";

interface FlaggedExpert {
  id: string; email: string; oneStarCount: number; averageRating: number;
  totalReviews: number; isSuspended: boolean;
  profile: { fullName: string | null; photoUrl: string | null; specialization: string | null } | null;
}

export default function FlaggedTab({ searchQuery = "" }: { searchQuery?: string }) {
  const { t } = useLocale();
  const [experts, setExperts] = useState<FlaggedExpert[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const load = () => { adminAPI.getFlaggedExperts().then(setExperts).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const handleSuspend = async (id: string) => {
    try { await adminAPI.suspendExpert(id); setMsg("Expert suspended"); load(); } catch {}
  };
  const handleUnsuspend = async (id: string) => {
    try { await adminAPI.unsuspendExpert(id); setMsg("Expert unsuspended"); load(); } catch {}
  };

  const q = searchQuery.toLowerCase();
  const filtered = experts.filter((e) =>
    !q ||
    e.email.toLowerCase().includes(q) ||
    (e.profile?.fullName || "").toLowerCase().includes(q) ||
    (e.profile?.specialization || "").toLowerCase().includes(q) ||
    (e.isSuspended ? "suspended" : "active").includes(q)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">{t("admin.flaggedExperts")} {searchQuery ? <span className="text-sm font-normal text-slate-500">({filtered.length} of {experts.length})</span> : <span>({experts.length})</span>}</h2>
      </div>
      {msg && (
        <div className={`p-3 glass-sm text-sm rounded-lg ${msg.includes("unsuspended") ? "border border-emerald-500/20 text-emerald-400" : "border border-red-500/20 text-red-400"}`}>
          {msg}
        </div>
      )}
      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-slate-800/40 animate-pulse" />)}</div>
      ) : experts.length === 0 ? (
        <div className="glass-card-premium p-12 text-center"><p className="text-slate-400">No flagged experts.</p></div>
      ) : (
        <div className="glass-card-premium overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="p-3 sm:p-4">{t("admin.expert")}</th>
                  <th className="p-3 sm:p-4">{t("admin.oneStarCount")}</th>
                  <th className="p-3 sm:p-4">{t("marketplace.rating")}</th>
                  <th className="p-3 sm:p-4">{t("admin.totalReviews")}</th>
                  <th className="p-3 sm:p-4">{t("admin.suspended")}</th>
                  <th className="p-3 sm:p-4">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="p-12 text-center text-slate-500">No results for &apos;{searchQuery}&apos;</td></tr>
                ) : (
                  filtered.map((e) => (
                    <tr key={e.id} className="border-b border-white/[0.03] hover:bg-white/5 transition-colors">
                      <td className="p-3 sm:p-4">
                        <div className="flex items-center gap-3">
                          {e.profile?.photoUrl
                            ? <Image src={e.profile.photoUrl} alt="" width={32} height={32} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                            : <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-xs font-bold text-slate-800 flex-shrink-0">{e.email[0].toUpperCase()}</div>}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate max-w-[100px] sm:max-w-[200px]">{e.profile?.fullName || e.email}</p>
                            {e.profile?.specialization && <p className="text-xs text-slate-500 truncate max-w-[100px] sm:max-w-[200px]">{e.profile.specialization}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 sm:p-4"><span className="text-sm font-bold text-red-400">{e.oneStarCount}</span></td>
                      <td className="p-3 sm:p-4 text-sm text-slate-300">{e.averageRating.toFixed(1)} ★</td>
                      <td className="p-3 sm:p-4 text-sm text-slate-400">{e.totalReviews}</td>
                      <td className="p-3 sm:p-4">
                        {e.isSuspended
                          ? <span className="badge badge-red">{t("admin.suspended")}</span>
                          : <span className="badge badge-emerald">{t("common.online")}</span>}
                      </td>
                      <td className="p-3 sm:p-4">
                        {e.isSuspended ? (
                          <button onClick={() => handleUnsuspend(e.id)}
                            className="text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-3 py-1.5 rounded-lg font-semibold transition">{t("admin.unsuspend")}</button>
                        ) : (
                          <button onClick={() => handleSuspend(e.id)}
                            className="text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 px-3 py-1.5 rounded-lg font-semibold transition">{t("admin.suspend")}</button>
                        )}
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
