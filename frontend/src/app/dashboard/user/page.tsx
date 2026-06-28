"use client";

import { useEffect, useState, useRef } from "react";
import { orderAPI, profileAPI, paymentAPI, reviewAPI, reportAPI, aiAPI, uploadAPI } from "@/lib/api";
import { getUser, isLoggedIn } from "@/lib/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "@/i18n/LocaleContext";
import { fDZD } from "@/lib/format";
import { StarIcon } from "@/components/StarIcon";
import Image from "next/image";

type Tab = "overview" | "profile" | "plans" | "wallet" | "orders";

interface Order {
  id: string;
  status: string;
  paymentStatus: string;
  amount: number | null;
  createdAt: string;
  service: {
    title: string;
    price: number;
    expertId?: string;
    imageUrl?: string;
    expert?: { id: string; email: string; profile?: { fullName: string | null; photoUrl: string | null } };
  };
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  status: string;
  description: string | null;
  createdAt: string;
}

// Polished Cyber-Dark Input Classes
const inputClasses = "w-full bg-[#07080f] border border-white/10 text-white rounded-xl px-5 py-4 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600 shadow-inner font-medium";

function UploadButton({ onUpload }: { onUpload: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadAPI.uploadFile(file);
      onUpload(res.url);
    } catch {} finally {
      setUploading(false);
    }
  };

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
      <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
        className="px-6 py-4 rounded-xl bg-white/5 text-white font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all border border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.5)] disabled:opacity-50"
      >
        <span className="flex items-center gap-2">
          {uploading ? (
            <svg className="animate-spin w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          ) : (
            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          )}
          {uploading ? "UPLOADING..." : "UPLOAD PHOTO"}
        </span>
      </button>
    </>
  );
}

function AnimatedCounter({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number | null>(null);
  useEffect(() => {
    let start = 0;
    const increment = value / (duration / 16);
    const step = () => {
      start += increment;
      if (start >= value) { setDisplay(value); return; }
      setDisplay(Math.floor(start));
      ref.current = requestAnimationFrame(step);
    };
    ref.current = requestAnimationFrame(step);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [value]);
  return <>{display}</>;
}

export default function UserDashboard() {
  const router = useRouter();
  const { t } = useLocale();
  const [user, setUser] = useState<{ email: string; role: string } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile state
  const [profile, setProfile] = useState<any>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fullName: "", bio: "", phone: "", photoUrl: "", weight: "", height: "", goal: "" });

  // Wallet state
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositing, setDepositing] = useState(false);
  const [walletMsg, setWalletMsg] = useState("");

  // Confirm loading
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  // Review modal state
  const [reviewModal, setReviewModal] = useState<{
    orderId: string; serviceTitle: string; expertId: string; expertName: string
  } | null>(null);
  const [modalView, setModalView] = useState<"rate" | "report" | "done">("rate");
  const [modalRating, setModalRating] = useState(0);
  const [modalHover, setModalHover] = useState(0);
  const [modalComment, setModalComment] = useState("");
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalReportReason, setModalReportReason] = useState("");
  const [modalReportDesc, setModalReportDesc] = useState("");
  const [modalReportSubmitting, setModalReportSubmitting] = useState(false);
  const [modalReportMsg, setModalReportMsg] = useState("");

  // Plans state
  const [plans, setPlans] = useState<any[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadProfile = async () => {
    try {
      const p = await profileAPI.getMyProfile();
      setProfile(p);
      if (p?.photoUrl) {
        setProfilePhoto(p.photoUrl);
        localStorage.setItem("profile_photo", p.photoUrl);
      }
      setForm({
        fullName: p?.fullName || "",
        bio: p?.bio || "",
        phone: p?.phone || "",
        photoUrl: p?.photoUrl || "",
        weight: p?.weight?.toString() || "",
        height: p?.height?.toString() || "",
        goal: p?.goal || "",
      });
    } catch {}
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const data: Record<string, unknown> = {};
      if (form.fullName) data.fullName = form.fullName;
      if (form.bio) data.bio = form.bio;
      if (form.phone) data.phone = form.phone;
      if (form.photoUrl) data.photoUrl = form.photoUrl;
      if (form.weight) data.weight = parseFloat(form.weight);
      if (form.height) data.height = parseFloat(form.height);
      if (form.goal) data.goal = form.goal;
      const updated = await profileAPI.updateProfile(data);
      setProfile(updated);
      if (updated?.photoUrl) {
        setProfilePhoto(updated.photoUrl);
        localStorage.setItem("profile_photo", updated.photoUrl);
      }
      setEditMode(false);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const loadPlans = async () => {
    try { const data = await aiAPI.getPlans(); setPlans(data.plans); } catch {} finally { setPlansLoading(false); }
  };

  const handleSetActive = async (id: string) => {
    try { await aiAPI.updatePlan(id, { isActive: true }); setPlans((prev) => prev.map((p) => ({ ...p, isActive: p.id === id }))); } catch {}
  };

  const handleSchedule = async (id: string, date: string) => {
    setSchedulingId(id);
    try { await aiAPI.updatePlan(id, { scheduledDate: date }); setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, scheduledDate: date } : p))); } finally { setSchedulingId(null); }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm("Delete this plan?")) return;
    setDeletingId(id);
    try { await aiAPI.deletePlan(id); setPlans((prev) => prev.filter((p) => p.id !== id)); } finally { setDeletingId(null); }
  };

  const loadWallet = async () => {
    try { const b = await paymentAPI.getBalance(); setBalance(b.balance); } catch {}
    try { const t = await paymentAPI.getTransactions(); setTransactions(t); } catch {}
  };

  const loadOrders = async () => {
    try { const data = await orderAPI.getMyOrders(); setOrders(data); } catch {}
  };

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) return;
    setDepositing(true); setWalletMsg("");
    try {
      const res = await paymentAPI.deposit(amount);
                    setBalance(res.balance); setDepositAmount(""); setWalletMsg(`Deposit of ${fDZD(amount)} successful.`);
      const t = await paymentAPI.getTransactions(); setTransactions(t);
    } catch (err: unknown) { setWalletMsg((err as Error).message); }
    setDepositing(false);
  };

  const handlePay = async (orderId: string) => {
    setPayingId(orderId); setWalletMsg("");
    try { await paymentAPI.payOrder(orderId); setWalletMsg(t("dashboard.paymentHeld")); await loadOrders(); await loadWallet(); } catch (err: unknown) { setWalletMsg((err as Error).message); }
    setPayingId(null);
  };

  const handleConfirmRelease = async (order: Order) => {
    const expertId = order.service.expert?.id || order.service.expertId || "";
    const expertName = order.service.expert?.profile?.fullName || order.service.expert?.email || "Expert";
    setConfirmingId(order.id); setWalletMsg("");
    try {
      await paymentAPI.confirmRelease(order.id);
      await loadOrders(); await loadWallet();
      setReviewModal({ orderId: order.id, serviceTitle: order.service.title, expertId, expertName });
      setModalView("rate"); setModalRating(0); setModalComment(""); setModalError(""); setModalReportReason(""); setModalReportDesc(""); setModalReportMsg("");
    } catch (err: unknown) { setWalletMsg((err as Error).message); }
    setConfirmingId(null);
  };

  const handleModalReviewSubmit = async () => {
    if (modalRating === 0) return;
    setModalSubmitting(true); setModalError("");
    try { await reviewAPI.createReview(reviewModal!.orderId, modalRating, modalComment); setModalView("done"); } catch (err: unknown) { setModalError((err as Error).message); }
    setModalSubmitting(false);
  };

  const handleModalReportSubmit = async () => {
    if (!modalReportReason) return;
    setModalReportSubmitting(true); setModalReportMsg("");
    try { await reportAPI.createReport(reviewModal!.expertId, modalReportReason, modalReportDesc || undefined); setModalView("done"); } catch (err: unknown) { setModalReportMsg((err as Error).message); }
    setModalReportSubmitting(false);
  };

  const closeModal = () => { setReviewModal(null); setModalView("rate"); };

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    setUser(getUser());
    const load = async () => {
      try { await loadOrders(); } catch {}
      await loadProfile();
      setLoading(false);
    };
    load();
    loadWallet();
    loadPlans();
  }, []);

  const paymentStatusBadge = (ps: string) => {
    const configs: Record<string, { bg: string, text: string, border: string, icon: string, label: string }> = {
      PENDING: { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-400", icon: "⏳", label: t("dashboard.awaitingPayment") },
      HELD: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400", icon: "🔒", label: t("dashboard.paymentHeld") },
      RELEASED: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", icon: "✅", label: t("dashboard.paymentReleased") },
      REFUNDED: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", icon: "↩️", label: t("dashboard.orderRefunded") },
      CANCELLED: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", icon: "❌", label: t("dashboard.orderRefunded") },
    };
    const c = configs[ps] || { bg: "bg-white/5", border: "border-white/10", text: "text-slate-400", icon: "📦", label: ps };
    return <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border ${c.bg} ${c.text} ${c.border} shadow-sm`}>{c.icon} {c.label}</span>;
  };

  const transIcon: Record<string, string> = {
    DEPOSIT: "💰", HOLD: "🔒", RELEASE: "✅", REFUND: "↩️",
  };

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "overview", label: "Overview", icon: "👁️" },
    { key: "profile", label: "Profile", icon: "👤" },
    { key: "plans", label: "Plans", icon: "🦾" },
    { key: "wallet", label: "Wallet", icon: "💳" },
    { key: "orders", label: "Orders", icon: "📦" },
  ];

  const fullName = profile?.fullName || user?.email?.split("@")[0] || "USER_UNKNOWN";

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin drop-shadow-[0_0_15px_rgba(16,185,129,0.8)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-slate-100 relative z-0 selection:bg-emerald-500/30">
      {/* Decorative cyber backdrop circles */}
      <div className="absolute top-[10%] left-[5%] w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[5%] w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="flex flex-col lg:flex-row max-w-[1600px] mx-auto min-h-screen relative gap-6 px-4 lg:px-8 py-8 lg:py-12">
        
        {/* FLOATING CYBER DOCK (Balanced & Aligned to avoid collisions) */}
        <nav className="fixed lg:sticky bottom-4 lg:top-28 left-4 right-4 lg:left-0 lg:h-[calc(100vh-140px)] lg:w-24 bg-[#0a0b16]/95 backdrop-blur-3xl border border-white/10 rounded-2xl lg:rounded-[2rem] z-40 flex lg:flex-col items-center justify-between lg:justify-start py-3 px-5 lg:py-8 lg:px-0 shadow-[0_15px_40px_rgba(0,0,0,0.8)] overflow-x-auto lg:overflow-visible gap-2 lg:gap-6 shrink-0">
          
          <div className="hidden lg:flex w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 items-center justify-center text-lg font-black text-black shadow-[0_0_15px_rgba(16,185,129,0.3)] mb-4">
            {user?.email?.[0].toUpperCase() || "U"}
          </div>

          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`group relative flex flex-col items-center justify-center w-12 h-12 lg:w-16 lg:h-16 rounded-xl transition-all duration-300 shrink-0 ${
                  isActive
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)] scale-105"
                    : "hover:bg-white/5 border border-transparent text-slate-400 hover:text-white"
                }`}
              >
                <span className={`relative text-xl lg:text-2xl transition-transform duration-300 ${isActive ? "scale-105" : "group-hover:scale-105"}`}>
                  {tab.icon}
                </span>
                <span className={`absolute -bottom-4 text-[8px] font-black tracking-widest uppercase transition-all duration-300 ${isActive ? "opacity-100 text-emerald-400" : "opacity-0 translate-y-[-5px] group-hover:opacity-100 group-hover:translate-y-0 text-slate-500"}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 lg:pl-4 pb-24 lg:pb-0 min-w-0">
          
          {/* HEADER DASHBOARD CARD (Polished colors & placement) */}
          <div className="relative mb-8 overflow-hidden rounded-2xl bg-[#0a0b16]/90 backdrop-blur-2xl border border-white/10 p-6 lg:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.6)] animate-fade-up group">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            <div className="relative flex items-center justify-between flex-wrap gap-6 z-10">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,1)]" />
                  AthletiX
                </div>
                <h1 className="text-3xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tighter uppercase">
                  Dashboard
                </h1>
                <p className="text-slate-400 font-bold mt-2 flex items-center gap-3 text-xs lg:text-sm font-mono">
                  <span className="text-emerald-500">_ID:</span> {user?.email}
                </p>
              </div>
            </div>
          </div>

          <div className="animate-fade-up-d2 relative z-10">
            {/* OVERVIEW TAB */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Hero Bento */}
                  <div className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-[#0a0b16]/90 backdrop-blur-2xl border border-white/10 p-6 lg:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.6)] group flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[80px] rounded-full pointer-events-none" />
                    <div className="relative shrink-0">
                      <div className="w-28 h-28 lg:w-36 lg:h-36 rounded-xl overflow-hidden border border-white/15 shadow-[0_0_20px_rgba(0,0,0,0.5)] bg-[#050505] relative group-hover:scale-102 transition-transform duration-500">
                        {profilePhoto ? (
                          <Image src={profilePhoto} alt="" fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-4xl font-black text-black">
                            {user?.email?.[0].toUpperCase() || "U"}
                          </div>
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-4 border-[#0a0b16] shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse" />
                    </div>
                    <div className="flex-1 text-center sm:text-left z-10">
                      <h2 className="text-2xl lg:text-3xl font-black text-white tracking-tighter uppercase mb-1">
                        {t("dashboard.welcomeBack")}
                      </h2>
                      <p className="text-base text-emerald-400 font-bold uppercase tracking-widest mb-5">
                        {fullName}
                      </p>
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                        <button onClick={() => setActiveTab("profile")} className="px-5 py-2.5 bg-white/5 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-500 hover:text-black border border-white/10 hover:border-emerald-400 transition-all duration-300">
                          Edit Profile
                        </button>
                        <Link href="/ai" className="px-5 py-2.5 bg-emerald-500 text-black text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all flex items-center gap-2">
                          <span>🦾</span> {t("dashboard.generatePlan")}
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Right side metric cards */}
                  <div className="flex flex-col gap-4">
                    <div className="flex-1 bg-gradient-to-br from-[#0c1a1a]/90 to-[#070b0f]/90 border border-emerald-500/20 p-6 flex flex-col justify-center items-center rounded-2xl shadow-lg transition-all duration-300">
                      <p className="text-3xl font-black text-emerald-400 tracking-tight">{fDZD(balance)}</p>
                      <p className="text-[9px] text-slate-500 mt-2 font-black uppercase tracking-widest">Balance</p>
                    </div>
                    <div className="flex-1 bg-gradient-to-br from-[#0c1624]/90 to-[#070b0f]/90 border border-cyan-500/20 p-6 flex flex-col justify-center items-center rounded-2xl shadow-lg transition-all duration-300">
                      <p className="text-3xl font-black text-cyan-400 tracking-tight"><AnimatedCounter value={orders.length} /></p>
                      <p className="text-[9px] text-slate-500 mt-2 font-black uppercase tracking-widest">Active Orders</p>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <Link href="/ai" className="bg-[#0a0b16]/90 backdrop-blur-2xl p-6 rounded-2xl border border-white/10 hover:border-emerald-500/40 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)] transition-all duration-300 group flex items-center gap-5">
                    <div className="w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform shrink-0">🦾</div>
                    <div>
                      <h3 className="font-black text-white text-base uppercase tracking-widest group-hover:text-emerald-400 transition-colors">AI Plans</h3>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">GENERATE & MANAGE AI PLANS</p>
                    </div>
                  </Link>
                  <Link href="/marketplace" className="bg-[#0a0b16]/90 backdrop-blur-2xl p-6 rounded-2xl border border-white/10 hover:border-blue-500/40 hover:shadow-[0_0_20px_rgba(59,130,246,0.1)] transition-all duration-300 group flex items-center gap-5">
                    <div className="w-14 h-14 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform shrink-0">🛒</div>
                    <div>
                      <h3 className="font-black text-white text-base uppercase tracking-widest group-hover:text-blue-400 transition-colors">MARKETPLACE</h3>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">HIRE VERIFIED EXPERTS</p>
                    </div>
                  </Link>
                </div>
              </div>
            )}

            {/* PROFILE TAB */}
            {activeTab === "profile" && (
              <div className="space-y-6 animate-in fade-in">
                <div className="flex items-center justify-between flex-wrap gap-4 bg-[#0a0b16]/90 backdrop-blur-2xl p-6 rounded-2xl border border-white/10">
                  <div>
                    <h2 className="text-xl font-black text-white tracking-tighter uppercase">My Profile</h2>
                    <p className="text-emerald-500 font-bold text-[10px] uppercase tracking-widest mt-0.5">Configure your bio-parameters</p>
                  </div>
                  <div className="flex gap-3">
                    {!editMode ? (
                      <button onClick={() => setEditMode(true)} className="px-5 py-2.5 bg-emerald-500 text-black text-xs font-black uppercase tracking-widest rounded-lg shadow-md hover:bg-emerald-400 transition-all">
                        Edit Profile
                      </button>
                    ) : (
                      <>
                        <button onClick={() => { setEditMode(false); setForm({ fullName: profile?.fullName || "", bio: profile?.bio || "", phone: profile?.phone || "", photoUrl: profile?.photoUrl || "", weight: profile?.weight?.toString() || "", height: profile?.height?.toString() || "", goal: profile?.goal || "" }); }} className="px-5 py-2.5 bg-white/5 text-white text-xs font-black uppercase tracking-widest rounded-lg hover:bg-white/10 transition-colors border border-white/10">
                          Cancel
                        </button>
                        <button onClick={handleSaveProfile} disabled={saving} className="px-6 py-2.5 bg-emerald-500 text-black text-xs font-black uppercase tracking-widest rounded-lg shadow-md hover:bg-emerald-400 transition-all disabled:opacity-50">
                          {saving ? "Saving..." : "Save"}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {!editMode ? (
                  <div className="bg-[#0a0b16]/90 backdrop-blur-2xl rounded-2xl p-6 lg:p-10 border border-white/10 flex flex-col md:flex-row gap-8">
                    <div className="flex flex-col items-center gap-4 shrink-0">
                      <div className="w-32 h-32 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-4xl font-black text-black border border-white/10 overflow-hidden relative">
                        {profilePhoto ? <Image src={profilePhoto} alt="" fill className="object-cover" /> : user?.email?.[0].toUpperCase() || "U"}
                      </div>
                      <div className="text-center">
                        {profile?.fullName && <h3 className="text-lg font-black text-white uppercase tracking-wider">{profile.fullName}</h3>}
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{user?.email}</p>
                        <span className="inline-block mt-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                          {user?.role}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 space-y-6">
                      {profile?.bio && (
                        <div className="bg-white/5 p-5 rounded-xl border border-white/10 shadow-inner">
                          <p className="text-[9px] text-emerald-500 uppercase font-black tracking-widest mb-1.5">About</p>
                          <p className="text-xs text-slate-300 font-medium leading-relaxed">{profile.bio}</p>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {profile?.phone && (
                          <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                            <p className="text-[9px] text-emerald-500 uppercase font-black tracking-widest mb-1">Phone</p>
                            <p className="text-base font-black text-white">{profile.phone}</p>
                          </div>
                        )}
                        {profile?.weight && (
                          <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                            <p className="text-[9px] text-emerald-500 uppercase font-black tracking-widest mb-1">Weight (KG)</p>
                            <p className="text-base font-black text-white">{profile.weight}</p>
                          </div>
                        )}
                        {profile?.height && (
                          <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                            <p className="text-[9px] text-emerald-500 uppercase font-black tracking-widest mb-1">HEIGHT (CM)</p>
                            <p className="text-base font-black text-white">{profile.height}</p>
                          </div>
                        )}
                        {profile?.goal && (
                          <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                            <p className="text-[9px] text-emerald-500 uppercase font-black tracking-widest mb-1">Goal</p>
                            <p className="text-base font-black text-white uppercase tracking-tight">{profile.goal}</p>
                          </div>
                        )}
                      </div>

                      {!profile?.bio && !profile?.phone && !profile?.weight && !profile?.height && !profile?.goal && (
                        <div className="text-center py-8 border-2 border-dashed border-white/10 rounded-2xl">
                          <p className="text-xs text-slate-500 font-black uppercase tracking-widest">No profile data yet.</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#0a0b16]/90 backdrop-blur-2xl rounded-2xl p-6 lg:p-10 border border-white/10">
                    <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-3">
                      <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">👤</span>
                      Edit Profile
                    </h3>

                    <div className="mb-8">
                      <label className="block text-[9px] font-black text-slate-500 mb-2 uppercase tracking-widest">Avatar Image</label>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                        <div className="w-20 h-20 rounded-xl bg-black/50 border border-emerald-500/30 flex items-center justify-center text-2xl overflow-hidden relative shrink-0">
                          {form.photoUrl ? <Image src={form.photoUrl} alt="" fill className="object-cover" /> : "📸"}
                        </div>
                        <div className="flex-1 w-full flex flex-col sm:flex-row gap-3">
                          <UploadButton onUpload={(url) => setForm((f) => ({ ...f, photoUrl: url }))} />
                          {form.photoUrl && (
                            <button onClick={() => setForm((f) => ({ ...f, photoUrl: "" }))} className="px-5 py-3.5 bg-rose-500/10 text-rose-500 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-rose-500 hover:text-black transition-colors border border-rose-500/20">
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[9px] font-black text-slate-500 mb-2 uppercase tracking-widest">Full Name</label>
                        <input type="text" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} className={inputClasses} placeholder="John Doe" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-500 mb-2 uppercase tracking-widest">Phone</label>
                        <input type="text" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={inputClasses} placeholder="+213..." />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-500 mb-2 uppercase tracking-widest">Weight (KG)</label>
                        <input type="number" value={form.weight} onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))} className={inputClasses} placeholder="75" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-500 mb-2 uppercase tracking-widest">Height (CM)</label>
                        <input type="number" value={form.height} onChange={(e) => setForm((f) => ({ ...f, height: e.target.value }))} className={inputClasses} placeholder="175" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[9px] font-black text-slate-500 mb-2 uppercase tracking-widest">Goal</label>
                        <select value={form.goal} onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))} className={`${inputClasses} appearance-none`}>
                          <option value="" className="bg-[#0a0a0a] text-slate-400">Select a goal</option>
                          <option value="Lose weight" className="bg-[#0a0a0a]">Lose weight</option>
                          <option value="Build muscle" className="bg-[#0a0a0a]">Build muscle</option>
                          <option value="Improve endurance" className="bg-[#0a0a0a]">Improve endurance</option>
                          <option value="General fitness" className="bg-[#0a0a0a]">General fitness</option>
                          <option value="Flexibility" className="bg-[#0a0a0a]">Flexibility</option>
                          <option value="Sports performance" className="bg-[#0a0a0a]">Sports performance</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[9px] font-black text-slate-500 mb-2 uppercase tracking-widest">Biography</label>
                        <textarea value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} className={`${inputClasses} min-h-[120px] resize-none`}                         placeholder="Tell us about yourself..." />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PLANS TAB */}
            {activeTab === "plans" && (
              <div className="space-y-6 animate-in fade-in">
                <div className="flex items-center justify-between flex-wrap gap-4 bg-[#0a0b16]/90 backdrop-blur-2xl p-6 rounded-2xl border border-white/10">
                  <div>
                    <h2 className="text-xl font-black text-white tracking-tighter uppercase">🦾 {t("ai.myPlans")}</h2>
                    <p className="text-emerald-500 font-bold text-[10px] uppercase tracking-widest mt-0.5">[{plans.length}] Saved Plans</p>
                  </div>
                  <Link href="/ai" className="px-6 py-2.5 bg-emerald-500 text-black font-black text-xs uppercase tracking-widest rounded-lg shadow-md hover:bg-emerald-400 transition-all flex items-center gap-2">
                    <span>✨</span> New Plan
                  </Link>
                </div>

                {plansLoading ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => <div key={i} className="h-44 rounded-2xl bg-white/5 animate-pulse border border-white/5" />)}
                  </div>
                ) : plans.length === 0 ? (
                  <div className="bg-[#0a0b16]/90 backdrop-blur-2xl p-12 rounded-2xl border border-white/10 text-center">
                    <div className="text-5xl mb-4 opacity-25">📋</div>
                    <p className="text-white font-black text-xl uppercase tracking-widest mb-3">{t("ai.noPlans")}</p>
                    <Link href="/ai" className="px-6 py-3 bg-emerald-500/10 text-emerald-400 font-black text-xs uppercase tracking-widest rounded-lg hover:bg-emerald-500 hover:text-black border border-emerald-500/30 transition-all">
                      {t("ai.generatePlan")}
                    </Link>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {plans.map((p) => (
                      <div key={p.id} className="bg-[#0a0b16]/90 backdrop-blur-xl rounded-2xl border border-white/10 p-5 hover:border-emerald-500/30 transition-all group relative flex flex-col">
                        {p.isActive && (
                          <div className="absolute top-0 right-0 bg-emerald-500 text-black text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-lg rounded-tr-xl">
                            ACTIVE
                          </div>
                        )}
                        <div className="flex items-center gap-3.5 mb-4">
                          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xl text-emerald-400 shrink-0">🥗</div>
                          <div className="min-w-0 flex-1 pr-10">
                            <h3 className="font-black text-white text-base truncate uppercase tracking-tight">{p.title || "My Plan"}</h3>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{new Date(p.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mb-4 bg-white/5 p-2.5 rounded-lg border border-white/5">
                          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">🔥 {p.calories} KCAL</span>
                          <span className="text-slate-700">|</span>
                          {p.workoutPlace && <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.workoutPlace === "gym" ? "🏢 GYM" : "🏠 HOME"}</span>}
                        </div>
                        
                        {p.scheduledDate && <p className="text-[9px] font-black text-cyan-400 uppercase tracking-widest mb-4 bg-cyan-500/10 inline-block px-2.5 py-1 rounded-lg border border-cyan-500/20 w-fit">📅 SCHED: {new Date(p.scheduledDate).toLocaleDateString()}</p>}
                        
                        <div className="mt-auto flex flex-col gap-2.5 pt-3.5 border-t border-white/10">
                          <div className="flex items-center gap-2">
                            <Link href={`/plan/${p.id}`} className="flex-1 text-center bg-white/5 hover:bg-white/10 text-white font-black text-[9px] uppercase tracking-widest py-2.5 rounded-lg border border-white/10 transition-colors">
                              VIEW
                            </Link>
                            <button onClick={() => !p.isActive && handleSetActive(p.id)}
                              className={`flex-1 py-2.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all border ${p.isActive ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20 cursor-default" : "bg-white/5 hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-400 border-white/10 hover:border-emerald-500/30"}`}
                            >
                              {p.isActive ? "ACTIVE" : "SET ACTIVE"}
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="date" onChange={(e) => handleSchedule(p.id, e.target.value)} disabled={schedulingId === p.id}
                              className="flex-1 py-2 px-2.5 text-[9px] font-black uppercase tracking-widest rounded-lg bg-black/40 border border-white/10 text-slate-300 focus:border-cyan-500/50 outline-none" title={t("ai.schedulePlan")}
                            />
                            <button onClick={() => handleDeletePlan(p.id)} disabled={deletingId === p.id}
                              className="w-9 py-2 rounded-lg text-rose-500 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500 hover:text-black transition-all flex items-center justify-center disabled:opacity-50"
                            >
                              {deletingId === p.id ? "..." : "✕"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* WALLET TAB */}
            {activeTab === "wallet" && (
              <div className="space-y-6 animate-in fade-in">
                {/* Balance Hero Card */}
                <div className="relative overflow-hidden rounded-2xl bg-[#090a14] p-8 lg:p-12 border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.6)] group">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10 opacity-60 pointer-events-none" />
                  <div className="absolute -top-32 -right-32 w-[350px] h-[350px] bg-emerald-500/5 rounded-full blur-[90px] pointer-events-none" />
                  <div className="absolute -bottom-16 -left-16 w-[300px] h-[300px] bg-cyan-500/5 rounded-full blur-[80px] pointer-events-none" />

                  <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border border-white/10 px-3 py-1.5 rounded-lg bg-black/40 backdrop-blur-md">Wallet</h2>
                      </div>
                      <p className="text-5xl lg:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 tracking-tighter">
                        {fDZD(balance)}
                      </p>
                      <p className="text-emerald-500 font-black text-[10px] uppercase tracking-widest mt-4 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                        Active
                      </p>
                    </div>
                  </div>
                </div>

                {walletMsg && (
                  <div className={`p-4 text-xs font-black uppercase tracking-widest rounded-xl flex items-center gap-3 border ${
                    walletMsg.includes("successful") || walletMsg.includes("held") ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                   }`}>
                     <span className="text-lg">{walletMsg.includes("successful") || walletMsg.includes("held") ? "✅" : "⚠️"}</span> {walletMsg}
                  </div>
                )}

                {/* Deposit Funds Card */}
                <div className="bg-[#0a0b16]/90 backdrop-blur-2xl rounded-2xl p-6 lg:p-8 border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
                  <h3 className="text-xs font-black text-white mb-4 flex items-center gap-2.5 uppercase tracking-widest">
                    <span className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-base border border-white/10">💳</span>
                    Deposit
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-4">Deposit funds to purchase services.</p>
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <div className="flex-1 w-full max-w-md relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-black text-sm">DZD</span>
                      <input type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)}
                        className={`${inputClasses} pl-14 py-4 text-base`} placeholder="0.00" min="1" step="0.01"
                        onKeyDown={(e) => { if (e.key === "Enter") handleDeposit(); }}
                      />
                    </div>
                    <button onClick={handleDeposit} disabled={depositing || !depositAmount}
                      className="w-full sm:w-auto px-8 py-4 bg-emerald-500 text-black font-black text-xs uppercase tracking-widest rounded-xl disabled:opacity-50 hover:bg-emerald-400 transition-all flex items-center justify-center gap-2"
                    >
                      {depositing ? (
                        <svg className="animate-spin w-4 h-4 text-black" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                      )}
                      {depositing ? "Processing..." : "Deposit"}
                    </button>
                  </div>
                </div>

                {/* Ledger (Transactions) */}
                {transactions.length > 0 && (
                  <div className="bg-[#0a0b16]/90 backdrop-blur-2xl rounded-2xl p-6 lg:p-8 border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
                    <h3 className="text-xs font-black text-white mb-6 flex items-center gap-2.5 uppercase tracking-widest">
                      <span className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-base">📋</span>
                      History
                    </h3>
                    <div className="divide-y divide-white/5">
                      {transactions.slice(0, 10).map((tx: any) => {
                        const isCredit = tx.type === "DEPOSIT" || tx.type === "RELEASE" || tx.type === "REFUND";
                        return (
                          <div key={tx.id} className="py-4 flex items-center justify-between hover:bg-white/5 px-4 -mx-4 rounded-xl transition-all duration-300 group">
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl border ${
                                tx.type === "DEPOSIT" ? "bg-emerald-500/10 border-emerald-500/20" :
                                tx.type === "RELEASE" ? "bg-cyan-500/10 border-cyan-500/20" :
                                tx.type === "REFUND" ? "bg-amber-500/10 border-amber-500/20" : "bg-rose-500/10 border-rose-500/20"
                              }`}>
                                {transIcon[tx.type] || "💳"}
                              </div>
                              <div>
                                <p className="text-xs font-black text-white uppercase tracking-widest group-hover:text-emerald-400 transition-colors">{tx.description || tx.type}</p>
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1 flex items-center gap-1.5 font-mono">
                                  <span>{new Date(tx.createdAt).toLocaleDateString()}</span>
                                  <span className="w-1 h-1 rounded-full bg-slate-600" />
                                  <span>{new Date(tx.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                </p>
                              </div>
                            </div>
                            <span className={`text-base font-black ${isCredit ? "text-emerald-400" : "text-rose-400"}`}>
                              {isCredit ? "+" : "-"}{fDZD(tx.amount)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ORDERS TAB */}
            {activeTab === "orders" && (
              <div className="space-y-6 animate-in fade-in">
                <div className="bg-[#0a0b16]/90 backdrop-blur-2xl p-6 rounded-2xl border border-white/10 flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h2 className="text-xl font-black text-white tracking-tighter uppercase">Orders</h2>
                    <p className="text-emerald-500 font-bold text-[10px] uppercase tracking-widest mt-0.5">[{orders.length}] Orders</p>
                  </div>
                </div>

                <div className="bg-[#0a0b16]/90 backdrop-blur-2xl rounded-2xl p-6 lg:p-8 border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.5)] relative overflow-hidden">
                  <div className="absolute -top-20 -left-20 w-80 h-80 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />
                  
                  {orders.length === 0 ? (
                    <div className="text-center py-16 relative z-10">
                      <div className="text-6xl mb-4 opacity-20">📦</div>
                      <h3 className="text-xl font-black text-white mb-2 uppercase tracking-widest">{t("dashboard.noOrders")}</h3>
                      <Link href="/marketplace" className="inline-block mt-4 px-6 py-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black text-xs uppercase tracking-widest rounded-lg hover:bg-emerald-500 hover:text-black transition-all">
                        {t("dashboard.browseServices")}
                      </Link>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-6 relative z-10">
                      {orders.map((order) => {
                        const expertId = order.service.expert?.id || order.service.expertId || "";
                        const expertName = order.service.expert?.profile?.fullName || order.service.expert?.email || "EXPERT_UNKNOWN";
                        const isPending = order.paymentStatus === "PENDING";
                        const isHeld = order.paymentStatus === "HELD";

                        return (
                          <div key={order.id} className="bg-black/40 p-6 rounded-xl border border-white/10 hover:border-emerald-500/20 transition-all duration-300 group flex flex-col">
                            <div className="flex items-start gap-4 mb-4">
                              {order.service.imageUrl ? (
                                <Image src={order.service.imageUrl} alt="" width={56} height={56} className="w-14 h-14 rounded-xl object-cover border border-white/10 flex-shrink-0" />
                              ) : (
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500/15 to-cyan-500/15 border border-emerald-500/20 flex items-center justify-center text-xl text-emerald-400 flex-shrink-0">
                                  🏷️
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <h3 className="font-black text-white text-base truncate mb-1.5 uppercase tracking-tight group-hover:text-emerald-400 transition-colors">{order.service.title}</h3>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                  Expert <span className="text-white bg-white/5 px-2 py-0.5 rounded ml-1 font-mono">{expertName}</span>
                                </p>
                                <div className="flex flex-wrap items-center gap-2">
                                  {paymentStatusBadge(order.paymentStatus)}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5 mb-4">
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Price</span>
                              <span className="text-xl font-black text-emerald-400">{fDZD(order.service.price)}</span>
                            </div>

                            <div className="mt-auto flex flex-col gap-2.5">
                              {isPending && (
                                <button onClick={() => handlePay(order.id)} disabled={payingId === order.id}
                                  className="w-full py-3 bg-amber-500 text-black font-black text-[10px] uppercase tracking-widest rounded-lg hover:bg-amber-400 transition-all disabled:opacity-50"
                                >
                                  {payingId === order.id ? "Processing..." : "Pay"}
                                </button>
                              )}
                              {isHeld && (
                                <button onClick={() => handleConfirmRelease(order)} disabled={confirmingId === order.id}
                                  className="w-full py-3 bg-emerald-500 text-black font-black text-[10px] uppercase tracking-widest rounded-lg hover:bg-emerald-400 transition-all disabled:opacity-50"
                                >
                                  {confirmingId === order.id ? "Processing..." : "Confirm"}
                                </button>
                              )}
                              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest font-mono">Date: {new Date(order.createdAt).toLocaleDateString()}</span>
                                {expertId && (
                                  <Link href={`/messages?expertId=${expertId}`} className="px-3.5 py-2 bg-white/5 text-white font-black text-[8px] uppercase tracking-widest rounded-lg hover:bg-emerald-500 hover:text-black transition-colors border border-white/10 flex items-center gap-1.5">
                                    <span className="text-xs">💬</span> Chat
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* REVIEW/REPORT MODAL */}
            {reviewModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-[#0b0c16] max-w-md w-full p-8 rounded-2xl shadow-[0_15px_45px_rgba(0,0,0,0.8)] border border-white/10 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-purple-500" />
                  
                  {modalView === "rate" && (
                    <>
                      <div className="text-center mb-6">
                        <div className="text-5xl mb-3">⭐</div>
                        <h2 className="text-xl font-black text-white uppercase tracking-widest mb-1">{t("review.title")}</h2>
                        <p className="text-emerald-500 font-bold text-xs uppercase tracking-widest">{reviewModal.serviceTitle}</p>
                      </div>
                      <div className="mb-6 text-center bg-white/5 p-4 rounded-xl border border-white/5">
                        <p className="text-[10px] font-black text-slate-400 mb-3 uppercase tracking-widest">{t("review.rating")}</p>
                        <div className="flex justify-center gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button key={star} onClick={() => setModalRating(star)}
                              onMouseEnter={() => setModalHover(star)} onMouseLeave={() => setModalHover(0)}
                              className="transition-transform hover:scale-110 focus:outline-none"
                            >
                              <StarIcon size={36}
                                className={star <= (modalHover || modalRating) ? "text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]" : "text-slate-700"}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="mb-6">
                        <textarea value={modalComment} onChange={(e) => setModalComment(e.target.value)}
                          className={`${inputClasses} min-h-[80px] resize-none`} placeholder={t("review.commentPlaceholder")}
                        />
                      </div>
                      {modalError && <div className="p-3 bg-rose-500/10 border border-rose-500/25 text-rose-400 text-[10px] font-black tracking-widest uppercase rounded-lg mb-4">{modalError}</div>}
                      <div className="flex gap-3">
                        <button onClick={closeModal} className="flex-1 py-3 bg-white/5 text-white font-black text-xs uppercase tracking-widest rounded-lg hover:bg-white/10 transition-colors border border-white/10">
                          {t("common.cancel")}
                        </button>
                        <button onClick={handleModalReviewSubmit} disabled={modalSubmitting || modalRating === 0}
                          className="flex-[2] py-3 bg-emerald-500 text-black font-black text-xs uppercase tracking-widest rounded-lg disabled:opacity-50 hover:bg-emerald-400 transition-all"
                        >
                          {modalSubmitting ? "Sending..." : t("review.submit")}
                        </button>
                      </div>
                      <div className="mt-6 text-center">
                        <button onClick={() => setModalView("report")}
                          className="text-[9px] text-rose-500/60 hover:text-rose-400 transition-colors font-black uppercase tracking-widest border-b border-rose-500/20 pb-0.5"
                        >
                          ⚠️ Report
                        </button>
                      </div>
                    </>
                  )}

                  {modalView === "report" && (
                    <>
                      <div className="text-center mb-6">
                        <div className="text-5xl mb-3 text-rose-500">⚠️</div>
                        <h2 className="text-xl font-black text-rose-500 uppercase tracking-widest mb-1">Report</h2>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest font-mono">{reviewModal.expertName}</p>
                      </div>
                      <div className="mb-4">
                        <select value={modalReportReason} onChange={(e) => setModalReportReason(e.target.value)} className={`${inputClasses} appearance-none`}>
                          <option value="" className="bg-[#050505]">-- Select a reason --</option>
                          <option value="Scam or fraudulent" className="bg-[#050505]">{t("report.reasonScam")}</option>
                          <option value="Harassment or abuse" className="bg-[#050505]">{t("report.reasonHarassment")}</option>
                          <option value="Unprofessional behavior" className="bg-[#050505]">{t("report.reasonUnprofessional")}</option>
                          <option value="Other" className="bg-[#050505]">{t("report.reasonOther")}</option>
                        </select>
                      </div>
                      <div className="mb-6">
                        <textarea value={modalReportDesc} onChange={(e) => setModalReportDesc(e.target.value)}
                          className={`${inputClasses} min-h-[100px] resize-none`} placeholder="Describe what happened..."
                        />
                      </div>
                      {modalReportMsg && (
                        <div className={`p-3 text-[10px] font-black uppercase tracking-widest rounded-lg mb-4 ${modalReportMsg.includes("success") ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border border-rose-500/20 text-rose-400"}`}>
                          {modalReportMsg}
                        </div>
                      )}
                      <div className="flex gap-3">
                        <button onClick={() => setModalView("rate")} className="flex-1 py-3 bg-white/5 text-white font-black text-xs uppercase tracking-widest rounded-lg hover:bg-white/10 transition-colors border border-white/10">
                          BACK
                        </button>
                        <button onClick={handleModalReportSubmit} disabled={modalReportSubmitting || !modalReportReason}
                          className="flex-[2] py-3 bg-rose-500 text-black font-black text-xs uppercase tracking-widest rounded-lg disabled:opacity-50 hover:bg-rose-400 transition-all"
                        >
                          {modalReportSubmitting ? "Sending..." : "Submit"}
                        </button>
                      </div>
                    </>
                  )}

                  {modalView === "done" && (
                    <div className="text-center py-6">
                      <div className="text-6xl mb-4">✅</div>
                      <h2 className="text-xl font-black text-emerald-400 uppercase tracking-widest mb-6">
                        {modalRating > 0 ? "Feedback submitted" : "Report submitted"}
                      </h2>
                      <button onClick={closeModal} className="w-full py-3 bg-white/10 text-white border border-white/10 font-black text-xs uppercase tracking-widest rounded-lg hover:bg-white/20 transition-all">
                        Close
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}