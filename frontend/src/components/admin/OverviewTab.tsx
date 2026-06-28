"use client";

import { useLocale } from "@/i18n/LocaleContext";
import Link from "next/link";
import { fDZD } from "@/lib/format";
import { useAdminData } from "./AdminDataContext";
import StatsCard from "./StatsCard";

export default function OverviewTab() {
  const { t } = useLocale();
  const { data, loading } = useAdminData();

  if (loading) return <div className="grid grid-cols-2 md:grid-cols-3 gap-4">{[...Array(7)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-slate-800/40 animate-pulse" />)}</div>;

  const stats = data.stats;
  const cards = [
    { label: t("admin.totalUsers"), value: stats?.users ?? "—", color: "text-white", icon: "👥" },
    { label: t("admin.experts"), value: stats?.experts ?? "—", color: "text-blue-400", icon: "⭐" },
    { label: t("admin.admins"), value: stats?.admins ?? "—", color: "text-red-400", icon: "🔐" },
    { label: t("admin.totalServices"), value: stats?.services ?? "—", color: "text-emerald-400", icon: "🏷️" },
    { label: t("admin.totalOrders"), value: stats?.orders ?? "—", color: "text-amber-400", icon: "📦" },
    { label: t("admin.pendingOrders"), value: stats?.pendingOrders ?? "—", color: "text-orange-400", icon: "⏳" },
    { label: t("admin.platformRevenue"), value: stats ? fDZD(stats.platformFees) : "—", color: "text-emerald-400", icon: "💰" },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {cards.map((c, i) => <StatsCard key={i} {...c} />)}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass-card-premium p-4 sm:p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
            <h2 className="text-lg font-bold text-white">{t("admin.systemStatus")}</h2>
          </div>
          <div className="flex flex-col gap-2">
            {[
              t("admin.backendApi"),
              t("admin.database"),
              t("admin.fileUploads"),
              t("admin.aiService"),
            ].map((label, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/[0.04]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-lg" style={{ boxShadow: "0 0 8px rgba(52,211,153,0.4)" }} />
                <span className="text-sm text-slate-300">{label}</span>
                <span className="ml-auto text-[0.6rem] font-bold tracking-wider uppercase text-emerald-400/60">Online</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card-premium p-4 sm:p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></div>
            <h2 className="text-lg font-bold text-white">{t("admin.quickLinks")}</h2>
          </div>
          <div className="flex flex-col gap-2">
            {[
              { href: "/admin/users", label: t("admin.manageUsers") },
              { href: "/admin/services", label: t("admin.manageServices") },
              { href: "/marketplace", label: t("admin.viewMarketplace") },
              { href: "/ai", label: t("nav.aiAssistant") },
            ].map((link, i) => (
              <Link key={i} href={link.href}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/[0.04] text-sm text-slate-300 hover:text-white hover:bg-emerald-500/5 hover:border-emerald-500/10 transition-all group"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-hover:bg-emerald-400 transition-colors" />
                <span>{link.label}</span>
                <svg className="ml-auto w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
