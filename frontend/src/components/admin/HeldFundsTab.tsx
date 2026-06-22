"use client";

import { useEffect, useState } from "react";
import { paymentAPI } from "@/lib/api";
import { useLocale } from "@/i18n/LocaleContext";
import { fDZD } from "@/lib/format";

export default function HeldFundsTab({ searchQuery = "" }: { searchQuery?: string }) {
  const { t } = useLocale();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const load = async () => {
    try { const data = await paymentAPI.getHeldFunds(); setOrders(data); } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleRelease = async (id: string) => {
    if (!confirm("Release this payment to the expert?")) return;
    try { await paymentAPI.adminRelease(id); setMsg("Payment released to expert"); load(); } catch (err: unknown) { setMsg((err as Error).message); }
  };

  const handleRefund = async (id: string) => {
    if (!confirm("Refund this payment to the client?")) return;
    try { await paymentAPI.adminRefund(id); setMsg("Payment refunded to client"); load(); } catch (err: unknown) { setMsg((err as Error).message); }
  };

  const q = searchQuery.toLowerCase();
  const filtered = orders.filter((o) =>
    !q ||
    (o.service?.title || "").toLowerCase().includes(q) ||
    (o.user?.profile?.fullName || o.user?.email || "").toLowerCase().includes(q) ||
    (o.service?.expert?.profile?.fullName || o.service?.expert?.email || "").toLowerCase().includes(q)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">{t("admin.heldFundsDesc")} {searchQuery ? <span className="text-sm font-normal text-slate-500">({filtered.length} of {orders.length})</span> : <span>({orders.length})</span>}</h2>
      </div>

      {msg && (
        <div className={`p-3 glass-sm text-sm rounded-lg ${msg.includes("released") || msg.includes("refunded") ? "border border-emerald-500/20 text-emerald-400" : "border border-red-500/20 text-red-400"}`}>
          {msg}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-slate-800/40 animate-pulse" />)}</div>
      ) : orders.length === 0 ? (
        <div className="glass-card-premium p-12 text-center">
          <div className="text-5xl mb-4 opacity-60">🔒</div>
          <p className="text-slate-400">{t("admin.noFunds")}</p>
          <p className="text-slate-500 text-sm mt-1">{t("admin.noFundsDesc")}</p>
        </div>
      ) : (
        <div className="glass-card-premium overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="p-4">{t("admin.service")}</th>
                  <th className="p-4">{t("admin.client")}</th>
                  <th className="p-4">{t("admin.expert")}</th>
                  <th className="p-4">{t("admin.amount")}</th>
                  <th className="p-4">{t("admin.heldSince")}</th>
                  <th className="p-4">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="p-12 text-center text-slate-500">No results for &apos;{searchQuery}&apos;</td></tr>
                ) : (
                  filtered.map((order) => (
                    <tr key={order.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      <td className="p-4"><span className="text-sm font-semibold text-white">{order.service?.title || "—"}</span></td>
                      <td className="p-4 text-sm text-slate-300">{order.user?.profile?.fullName || order.user?.email || "—"}</td>
                      <td className="p-4 text-sm text-slate-300">{order.service?.expert?.profile?.fullName || order.service?.expert?.email || "—"}</td>
                      <td className="p-4 text-sm font-bold text-emerald-400">{fDZD(order.amount || order.service?.price || 0)}</td>
                      <td className="p-4 text-sm text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button onClick={() => handleRelease(order.id)}
                            className="text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-3 py-1.5 rounded-lg font-semibold transition">{t("admin.release")}</button>
                          <button onClick={() => handleRefund(order.id)}
                            className="text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 px-3 py-1.5 rounded-lg font-semibold transition">{t("admin.refund")}</button>
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
