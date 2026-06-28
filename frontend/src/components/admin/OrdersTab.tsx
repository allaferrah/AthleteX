"use client";

import { useEffect, useState } from "react";
import { adminAPI } from "@/lib/api";
import { useLocale } from "@/i18n/LocaleContext";
import { fDZD } from "@/lib/format";

export default function OrdersTab({ searchQuery = "" }: { searchQuery?: string }) {
  const { t } = useLocale();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const load = () => { adminAPI.getOrders().then(setOrders).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const handleStatusChange = async (id: string, status: string) => {
    try { await adminAPI.updateOrder(id, { status }); setMsg("Order updated"); load(); }
    catch (err: unknown) { setMsg((err as Error).message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this order?")) return;
    try { await adminAPI.deleteOrder(id); setMsg("Order deleted"); load(); }
    catch (err: unknown) { setMsg((err as Error).message); }
  };

  const statusColor: Record<string, string> = {
    pending: "badge-orange", completed: "badge-emerald", cancelled: "badge-red", in_progress: "badge-blue",
  };

  const q = searchQuery.toLowerCase();
  const filtered = orders.filter((o) =>
    !q ||
    (o.service?.title || "").toLowerCase().includes(q) ||
    (o.user?.profile?.fullName || o.user?.email || "").toLowerCase().includes(q) ||
    (o.service?.expert?.profile?.fullName || o.service?.expert?.email || "").toLowerCase().includes(q) ||
    (o.status || "").toLowerCase().includes(q)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Orders {searchQuery ? <span className="text-sm font-normal text-slate-500">({filtered.length} of {orders.length})</span> : <span>({orders.length})</span>}</h2>
      </div>

      {msg && (
        <div className={`p-3 glass-sm text-sm rounded-lg ${
          msg.includes("deleted") || msg.includes("updated") ? "border border-emerald-500/20 text-emerald-400" : "border border-red-500/20 text-red-400"
        }`}>{msg}</div>
      )}

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-slate-800/40 animate-pulse" />)}</div>
      ) : orders.length === 0 ? (
        <div className="glass-card-premium p-6 sm:p-12 text-center"><p className="text-slate-400">No orders yet.</p></div>
      ) : (
        <div className="glass-card-premium overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="p-3 sm:p-4">Service</th>
                  <th className="p-3 sm:p-4">Client</th>
                  <th className="p-3 sm:p-4">Expert</th>
                  <th className="p-3 sm:p-4">Amount</th>
                  <th className="p-3 sm:p-4">Status</th>
                  <th className="p-3 sm:p-4">Payment</th>
                  <th className="p-3 sm:p-4">Date</th>
                  <th className="p-3 sm:p-4">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="p-6 sm:p-12 text-center text-slate-500">No results for &apos;{searchQuery}&apos;</td></tr>
                ) : (
                  filtered.map((o) => (
                    <tr key={o.id} className="border-b border-white/[0.03] hover:bg-white/5 transition-colors">
                      <td className="p-3 sm:p-4 text-sm font-semibold text-white truncate max-w-[100px] sm:max-w-[200px]">{o.service?.title || "—"}</td>
                      <td className="p-3 sm:p-4 text-sm text-slate-300 truncate max-w-[100px] sm:max-w-[200px]">{o.user?.profile?.fullName || o.user?.email || "—"}</td>
                      <td className="p-3 sm:p-4 text-sm text-slate-300 truncate max-w-[100px] sm:max-w-[200px]">{o.service?.expert?.profile?.fullName || o.service?.expert?.email || "—"}</td>
                      <td className="p-3 sm:p-4 text-sm font-bold text-emerald-400">{fDZD(o.amount || o.service?.price || 0)}</td>
                      <td className="p-3 sm:p-4"><span className={`badge text-xs ${statusColor[o.status] || "badge-blue"}`}>{o.status}</span></td>
                      <td className="p-3 sm:p-4 text-sm text-slate-400">{o.paymentStatus || "—"}</td>
                      <td className="p-3 sm:p-4 text-sm text-slate-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                      <td className="p-3 sm:p-4">
                        <div className="flex gap-2">
                          <select value={o.status} onChange={(e) => handleStatusChange(o.id, e.target.value)}
                            className="bg-slate-800 text-xs text-slate-300 border border-white/80 rounded-lg px-2 py-1 outline-none focus:border-emerald-500">
                            <option value="pending">pending</option>
                             <option value="in_progress">Progress</option>
                            <option value="completed">completed</option>
                            <option value="cancelled">cancelled</option>
                          </select>
                          <button onClick={() => handleDelete(o.id)}
                            className="text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 px-2 py-1 rounded-lg">✕</button>
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
