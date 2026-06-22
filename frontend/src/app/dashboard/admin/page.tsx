"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getUser, isLoggedIn, logout } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useLocale } from "@/i18n/LocaleContext";
import { AdminDataProvider } from "@/components/admin/AdminDataContext";
import OverviewTab from "@/components/admin/OverviewTab";
import UsersTab from "@/components/admin/UsersTab";
import ServicesTab from "@/components/admin/ServicesTab";
import HeldFundsTab from "@/components/admin/HeldFundsTab";
import ReportsTab from "@/components/admin/ReportsTab";
import FlaggedTab from "@/components/admin/FlaggedTab";
import SportCategoriesTab from "@/components/admin/SportCategoriesTab";
import ProfitsTab from "@/components/admin/ProfitsTab";
import AITab from "@/components/admin/AITab";
import OrdersTab from "@/components/admin/OrdersTab";
import ReviewsTab from "@/components/admin/ReviewsTab";

type TabKey = "overview" | "users" | "services" | "orders" | "reviews" | "funds" | "reports" | "flagged" | "sports" | "profits" | "ai";

const primaryNav: { key: TabKey; label: string; icon: string }[] = [
  { key: "overview", label: "Overview", icon: "📊" },
  { key: "users", label: "Users", icon: "👥" },
  { key: "services", label: "Services", icon: "🏷️" },
  { key: "orders", label: "Orders", icon: "📦" },
  { key: "reviews", label: "Reviews", icon: "⭐" },
];

const secondaryNav: { key: TabKey; label: string; icon: string }[] = [
  { key: "funds", label: "Held Funds", icon: "💰" },
  { key: "reports", label: "Reports", icon: "⚠️" },
  { key: "flagged", label: "Flagged", icon: "🚩" },
  { key: "sports", label: "Sports", icon: "🏅" },
  { key: "profits", label: "Profits", icon: "📈" },
  { key: "ai", label: "AI", icon: "🤖" },
];

const ALL_TABS: TabKey[] = ["overview", "users", "services", "orders", "reviews", "funds", "reports", "flagged", "sports", "profits", "ai"];

const TAB_COMPONENTS: Record<TabKey, (props: { searchQuery: string }) => React.ReactNode> = {
  overview: () => <OverviewTab />,
  users: ({ searchQuery }) => <UsersTab searchQuery={searchQuery} />,
  services: ({ searchQuery }) => <ServicesTab searchQuery={searchQuery} />,
  orders: ({ searchQuery }) => <OrdersTab searchQuery={searchQuery} />,
  reviews: ({ searchQuery }) => <ReviewsTab searchQuery={searchQuery} />,
  funds: ({ searchQuery }) => <HeldFundsTab searchQuery={searchQuery} />,
  reports: ({ searchQuery }) => <ReportsTab searchQuery={searchQuery} />,
  flagged: ({ searchQuery }) => <FlaggedTab searchQuery={searchQuery} />,
  sports: ({ searchQuery }) => <SportCategoriesTab searchQuery={searchQuery} />,
  profits: () => <ProfitsTab />,
  ai: ({ searchQuery }) => <AITab searchQuery={searchQuery} />,
};

function AdminDashboardInner() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; role: string } | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { t } = useLocale();

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    const u = getUser();
    if (u?.role !== "ADMIN") { router.push("/login"); return; }
    setUser(u);
  }, []);

  const handleNav = (key: TabKey) => {
    setActiveTab(key);
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <>
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <div className={`sidebar-overlay ${sidebarOpen ? "open" : ""}`} onClick={() => setSidebarOpen(false)} />

      <div className="dashboard-grid">
        <aside className={`dashboard-sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="sidebar-logo">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 overflow-hidden">
              <Image src="/logo.png" alt="AthletiX" width={28} height={28} className="object-contain" />
            </div>
            <div>
              <p className="text-sm font-bold text-white tracking-tight">Athleti<span className="text-emerald-400">X</span></p>
              <p className="text-[0.6rem] font-semibold text-slate-500 tracking-widest uppercase">Admin Panel</p>
            </div>
          </div>

          <div className="sidebar-section-label">Main</div>
          {primaryNav.map((item) => (
            <button key={item.key} onClick={() => handleNav(item.key)}
              className={`sidebar-nav-item ${activeTab === item.key ? "active" : ""}`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}

          <div className="sidebar-section-label">Management</div>
          {secondaryNav.map((item) => (
            <button key={item.key} onClick={() => handleNav(item.key)}
              className={`sidebar-nav-item ${activeTab === item.key ? "active" : ""}`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}

          <div className="mt-auto pt-6 border-t border-white/[0.04] space-y-2">
            <div className="glass-sm p-3 flex items-center gap-3">
              <div className="avatar">A</div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">{user?.email || "Admin"}</p>
                <p className="text-[0.6rem] font-semibold text-emerald-400 tracking-wider uppercase">Superuser</p>
              </div>
            </div>
            <button onClick={handleLogout}
              className="sidebar-nav-item text-red-400 hover:text-red-300 hover:bg-red-500/5"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              <span>Logout</span>
            </button>
          </div>
        </aside>

        <main className="dashboard-main">
          <div className="dashboard-header">
            <div className="flex items-center gap-3">
              <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              </button>
              <div>
                <h1 className="text-xl font-bold gradient-text">{t("admin.title")}</h1>
                <p className="text-xs text-slate-500">Dashboard overview &amp; management</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="search-bar max-md:hidden">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(148,163,184,0.5)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <button onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Logout
              </button>
            </div>
          </div>

          {/* Tab Content — keep all tabs mounted, toggle visibility */}
          <div className="tab-content">
            {ALL_TABS.map((key) => (
              <div key={key} style={{ display: activeTab === key ? "block" : "none" }}>
                {TAB_COMPONENTS[key]({ searchQuery: search })}
              </div>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}

export default function AdminDashboard() {
  return (
    <AdminDataProvider>
      <AdminDashboardInner />
    </AdminDataProvider>
  );
}