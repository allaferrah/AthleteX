"use client";

import { useEffect, useState } from "react";
import { adminAPI } from "@/lib/api";
import { useLocale } from "@/i18n/LocaleContext";
import { fDZD } from "@/lib/format";
import StatsCard from "./StatsCard";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface PlatformStats {
  totalPlatformFees: number;
  platformFeeCount: number;
  releasedOrders: number;
  monthlyFees: { month: string; total: number }[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-sm p-3 text-sm border border-white/80 shadow-xl">
      <p className="text-slate-400 text-xs mb-1">{label}</p>
      <p className="text-emerald-400 font-bold">{fDZD(payload[0].value)}</p>
    </div>
  );
};

export default function ProfitsTab() {
  const { t, locale } = useLocale();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [fees, setFees] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsData, feesData] = await Promise.all([
          adminAPI.getPlatformStats(),
          adminAPI.getPlatformFeeTransactions(),
        ]);
        setStats(statsData);
        setFees(feesData.slice(0, 20));
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-slate-800/40 animate-pulse" />)}</div>;
  }

  if (!stats) return <div className="glass p-12 text-center"><p className="text-slate-400">{t("common.error")}</p></div>;

  const avgFee = stats.platformFeeCount > 0 ? (stats.totalPlatformFees / stats.platformFeeCount) : 0;

  const chartData = stats.monthlyFees.map((m) => ({
    month: locale === "ar"
      ? new Date(m.month + "-01").toLocaleDateString("ar-SA", { month: "short", year: "2-digit" })
      : new Date(m.month + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
    total: m.total,
  }));

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard label={t("admin.totalRevenue")} value={fDZD(stats.totalPlatformFees / 0.2)} color="text-emerald-400" icon="💰" />
        <StatsCard label={t("admin.platformFees")} value={fDZD(stats.totalPlatformFees)} color="text-amber-400" icon="📊" />
        <StatsCard label={t("admin.paidOrders")} value={stats.releasedOrders.toString()} color="text-blue-400" icon="✅" />
        <StatsCard label={t("admin.averageFee")} value={fDZD(avgFee)} color="text-purple-400" icon="📈" />
      </div>

      <div className="glass-card-premium p-6">
        <h2 className="text-lg font-bold text-white mb-6">{t("admin.monthlyEarnings")}</h2>
        {chartData.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">{t("admin.noFeesYet")}</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => fDZD(v)} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="total" fill="url(#profitGradient)" radius={[6, 6, 0, 0]} maxBarSize={50} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="glass overflow-hidden">
        <div className="p-6 pb-0">
          <h2 className="text-lg font-bold text-white">{t("admin.recentFees")}</h2>
        </div>
        {fees.length === 0 ? (
          <div className="p-12 text-center"><p className="text-slate-400">{t("admin.noFeesYet")}</p></div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="p-4">{t("admin.joined")}</th>
                  <th className="p-4">{t("admin.client")}</th>
                  <th className="p-4">{t("admin.orderAmount")}</th>
                  <th className="p-4">{t("admin.feeAmount")}</th>
                </tr>
              </thead>
              <tbody>
                {fees.map((f, i) => (
                  <tr key={i} className="border-b border-white/[0.03] hover:bg-white/5 transition-colors">
                    <td className="p-4 text-sm text-slate-500">{new Date(f.createdAt).toLocaleDateString()}</td>
                    <td className="p-4 text-sm text-slate-300">{f.from?.profile?.fullName || f.from?.email || "—"}</td>
                    <td className="p-4 text-sm text-white">{fDZD(f.amount / 0.2)}</td>
                    <td className="p-4 text-sm font-semibold text-amber-400">{fDZD(f.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
