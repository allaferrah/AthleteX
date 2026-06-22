"use client";

import { useEffect, useState } from "react";
import { adminAPI } from "@/lib/api";
import { useLocale } from "@/i18n/LocaleContext";

interface Report {
  id: string; reason: string; description: string | null; status: string; createdAt: string;
  reporter: { id: string; email: string };
  reportedExpert: { id: string; email: string };
}

export default function ReportsTab({ searchQuery = "" }: { searchQuery?: string }) {
  const { t } = useLocale();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const load = () => { adminAPI.getReports().then(setReports).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const handleResolve = async (id: string) => {
    try { await adminAPI.updateReportStatus(id, "RESOLVED"); setMsg("Report resolved"); load(); } catch {}
  };
  const handleDismiss = async (id: string) => {
    try { await adminAPI.updateReportStatus(id, "DISMISSED"); setMsg("Report dismissed"); load(); } catch {}
  };

  const statusColor: Record<string, string> = {
    PENDING: "badge-orange", RESOLVED: "badge-emerald", DISMISSED: "badge-red",
  };

  const q = searchQuery.toLowerCase();
  const filtered = reports.filter((r) =>
    !q ||
    r.reason.toLowerCase().includes(q) ||
    (r.description || "").toLowerCase().includes(q) ||
    r.reporter.email.toLowerCase().includes(q) ||
    r.reportedExpert.email.toLowerCase().includes(q) ||
    r.status.toLowerCase().includes(q)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">{t("admin.reports")} {searchQuery ? <span className="text-sm font-normal text-slate-500">({filtered.length} of {reports.length})</span> : <span>({reports.length})</span>}</h2>
      </div>
      {msg && <div className="p-3 glass-sm text-sm rounded-lg border border-emerald-500/20 text-emerald-400">{msg}</div>}
      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-slate-800/40 animate-pulse" />)}</div>
      ) : reports.length === 0 ? (
        <div className="glass-card-premium p-12 text-center"><p className="text-slate-400">No reports yet.</p></div>
      ) : (
        <div className="glass-card-premium overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="p-4">{t("admin.reportReason")}</th>
                  <th className="p-4">{t("common.user")}</th>
                  <th className="p-4">{t("admin.expert")}</th>
                  <th className="p-4">{t("admin.reportStatus")}</th>
                  <th className="p-4">{t("admin.joined")}</th>
                  <th className="p-4">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="p-12 text-center text-slate-500">No results for &apos;{searchQuery}&apos;</td></tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      <td className="p-4">
                        <p className="text-sm font-semibold text-white">{r.reason}</p>
                        {r.description && <p className="text-xs text-slate-500 mt-0.5">{r.description}</p>}
                      </td>
                      <td className="p-4 text-sm text-slate-300">{r.reporter.email}</td>
                      <td className="p-4 text-sm text-slate-300">{r.reportedExpert.email}</td>
                      <td className="p-4"><span className={`badge text-xs ${statusColor[r.status] || "badge-blue"}`}>{r.status}</span></td>
                      <td className="p-4 text-sm text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                      <td className="p-4">
                        {r.status === "PENDING" && (
                          <div className="flex gap-2">
                            <button onClick={() => handleResolve(r.id)}
                              className="text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-3 py-1.5 rounded-lg font-semibold transition">{t("admin.resolve")}</button>
                            <button onClick={() => handleDismiss(r.id)}
                              className="text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 px-3 py-1.5 rounded-lg font-semibold transition">{t("admin.dismiss")}</button>
                          </div>
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
