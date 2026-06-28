"use client";

import { useEffect, useState } from "react";
import { adminAPI } from "@/lib/api";
import { useLocale } from "@/i18n/LocaleContext";

export default function ReviewsTab({ searchQuery = "" }: { searchQuery?: string }) {
  const { t } = useLocale();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const load = () => { adminAPI.getReviews().then(setReviews).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this review?")) return;
    try { await adminAPI.deleteReview(id); setMsg("Review deleted"); load(); }
    catch (err: unknown) { setMsg((err as Error).message); }
  };

  const q = searchQuery.toLowerCase();
  const filtered = reviews.filter((r) =>
    !q ||
    (r.user?.profile?.fullName || r.user?.email || "").toLowerCase().includes(q) ||
    (r.service?.title || "").toLowerCase().includes(q) ||
    (r.comment || "").toLowerCase().includes(q) ||
    String(r.rating).includes(q)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Reviews {searchQuery ? <span className="text-sm font-normal text-slate-500">({filtered.length} of {reviews.length})</span> : <span>({reviews.length})</span>}</h2>
      </div>

      {msg && (
        <div className={`p-3 glass-sm text-sm rounded-lg ${
          msg.includes("deleted") ? "border border-emerald-500/20 text-emerald-400" : "border border-red-500/20 text-red-400"
        }`}>{msg}</div>
      )}

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-slate-800/40 animate-pulse" />)}</div>
      ) : reviews.length === 0 ? (
        <div className="glass-card-premium p-12 text-center"><p className="text-slate-400">No reviews yet.</p></div>
      ) : (
        <div className="glass-card-premium overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="p-4">User</th>
                  <th className="p-4">Service</th>
                  <th className="p-4">Rating</th>
                  <th className="p-4">Comment</th>
                  <th className="p-4">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="p-12 text-center text-slate-500">No results for &apos;{searchQuery}&apos;</td></tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.id} className="border-b border-white/[0.03] hover:bg-white/5 transition-colors">
                      <td className="p-4 text-sm text-slate-300">{r.user?.profile?.fullName || r.user?.email || "—"}</td>
                      <td className="p-4 text-sm font-semibold text-white">{r.service?.title || "—"}</td>
                      <td className="p-4">
                        <span className="text-sm text-amber-400 font-bold">{r.rating} ★</span>
                      </td>
                      <td className="p-4 text-sm text-slate-400 max-w-xs truncate">{r.comment || "—"}</td>
                      <td className="p-4">
                        <button onClick={() => handleDelete(r.id)}
                          className="text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 px-3 py-1.5 rounded-lg font-semibold transition">{t("admin.delete")}</button>
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
