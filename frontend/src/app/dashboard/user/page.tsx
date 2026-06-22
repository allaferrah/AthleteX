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
        className="btn-primary !py-1.5 !px-3 text-xs disabled:opacity-50"
      >
        {uploading ? "..." : "Upload Photo"}
      </button>
    </>
  );
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
      setBalance(res.balance); setDepositAmount(""); setWalletMsg(`${fDZD(amount)} deposited successfully!`);
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

  const statusColor: Record<string, string> = {
    pending: "badge-orange", completed: "badge-emerald", cancelled: "badge-red",
  };

  const paymentStatusBadge = (ps: string) => {
    const colors: Record<string, string> = {
      PENDING: "badge-orange", HELD: "badge-blue", RELEASED: "badge-emerald",
      REFUNDED: "badge-red", CANCELLED: "badge-red",
    };
    const labels: Record<string, string> = {
      PENDING: t("dashboard.awaitingPayment"), HELD: t("dashboard.paymentHeld"),
      RELEASED: t("dashboard.paymentReleased"), REFUNDED: t("dashboard.orderRefunded"),
      CANCELLED: t("dashboard.orderRefunded"),
    };
    return <span className={`badge ${colors[ps] || "badge-blue"}`}>{labels[ps] || ps}</span>;
  };

  const transIcon: Record<string, string> = {
    DEPOSIT: "💰", HOLD: "🔒", RELEASE: "✅", REFUND: "↩️",
  };

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "overview", label: "Overview", icon: "📊" },
    { key: "profile", label: "My Profile", icon: "👤" },
    { key: "plans", label: "My Plans", icon: "🤖" },
    { key: "wallet", label: "Wallet", icon: "💰" },
    { key: "orders", label: "Orders", icon: "📦" },
  ];

  const fullName = profile?.fullName || user?.email?.split("@")[0] || "";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Tab Bar */}
      <div className="flex flex-wrap gap-2 p-1 glass rounded-2xl border border-white/5 overflow-x-auto">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? "bg-emerald-500/15 text-emerald-300 shadow-sm border border-emerald-500/20"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <>
          <div className="relative mb-6 overflow-hidden rounded-3xl glass border border-white/5 p-8 md:p-10">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="relative flex items-center justify-between flex-wrap gap-6">
              <div className="flex items-center gap-5">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-2xl font-black text-black shadow-xl shadow-emerald-500/10 ring-2 ring-white/10 overflow-hidden relative">
                    {profilePhoto ? (
                      <Image src={profilePhoto} alt="" fill className="object-cover" />
                    ) : (
                      user?.email?.[0].toUpperCase() || "U"
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-[3px] border-[#050a18] shadow-lg shadow-emerald-500/30" />
                </div>
                <div>
                  <h1 className="text-3xl font-black gradient-text tracking-tight">
                    {t("dashboard.welcomeBack")}<span className="text-white"> 👋</span>
                  </h1>
                  <p className="text-slate-400 text-sm mt-1">{fullName}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setActiveTab("profile")} className="btn-ghost px-4 py-2 text-sm">
                  Edit Profile
                </button>
                <Link href="/ai" className="btn-primary px-6 py-2.5 text-sm shadow-lg hover:scale-[1.03] transition-all">
                  ✨ {t("dashboard.generatePlan")}
                </Link>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-5">
            <Link href="/ai" className="glass card-hover p-6 flex items-center gap-4 group border border-white/5 hover:border-emerald-500/30">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-white/5 flex items-center justify-center text-2xl group-hover:scale-110 transition shadow-sm">🤖</div>
              <div><h3 className="font-bold text-white tracking-tight">{t("nav.aiAssistant")}</h3><p className="text-[11px] text-slate-400 mt-0.5">{t("dashboard.generatePlanDesc")}</p></div>
            </Link>
            <Link href="/marketplace" className="glass card-hover p-6 flex items-center gap-4 group border border-white/5 hover:border-blue-500/30">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-white/5 flex items-center justify-center text-2xl group-hover:scale-110 transition shadow-sm">🛒</div>
              <div><h3 className="font-bold text-white tracking-tight">{t("nav.marketplace")}</h3><p className="text-[11px] text-slate-400 mt-0.5">{t("dashboard.browseServices")}</p></div>
            </Link>
            <div className="glass p-6 border border-white/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-white/5 flex items-center justify-center text-xl shadow-sm">💰</div>
                <div><h3 className="font-bold text-white tracking-tight">{fDZD(balance)}</h3><p className="text-[11px] text-slate-400 mt-0.5">{t("dashboard.balance")}</p></div>
              </div>
            </div>
            <div className="glass p-6 flex items-center justify-between border border-white/5">
              <div><h3 className="text-2xl font-bold text-white tracking-tight">{orders.length}</h3><p className="text-[11px] text-slate-400 mt-0.5">{t("dashboard.totalOrders")}</p></div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-white/5 flex items-center justify-center text-xl shadow-sm">📊</div>
            </div>
          </div>
        </>
      )}

      {/* PROFILE TAB */}
      {activeTab === "profile" && (
        <div className="glass p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">👤 My Profile</h2>
            {!editMode ? (
              <button onClick={() => setEditMode(true)} className="btn-primary !py-2 !px-5 text-sm">
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-3">
                <button onClick={handleSaveProfile} disabled={saving}
                  className="btn-primary !py-2 !px-5 text-sm disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button onClick={() => { setEditMode(false); setForm({ fullName: profile?.fullName || "", bio: profile?.bio || "", phone: profile?.phone || "", photoUrl: profile?.photoUrl || "", weight: profile?.weight?.toString() || "", height: profile?.height?.toString() || "", goal: profile?.goal || "" }); }}
                  className="btn-ghost !py-2 !px-5 text-sm"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {!editMode ? (
            <div className="flex flex-col md:flex-row gap-10">
              <div className="flex flex-col items-center gap-4">
                <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-4xl font-black text-black shadow-xl border border-white/10 overflow-hidden relative">
                  {profilePhoto ? (
                    <Image src={profilePhoto} alt="" fill className="object-cover" />
                  ) : (
                    user?.email?.[0].toUpperCase() || "U"
                  )}
                </div>
                {profile?.fullName && <h3 className="text-xl font-bold text-white">{profile.fullName}</h3>}
                <p className="text-sm text-slate-400">{user?.email}</p>
                <span className="badge badge-emerald">{user?.role}</span>
              </div>
              <div className="flex-1 space-y-4">
                {profile?.bio && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Bio</p>
                    <p className="text-sm text-slate-300">{profile.bio}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  {profile?.phone && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Phone</p>
                      <p className="text-sm text-slate-300">{profile.phone}</p>
                    </div>
                  )}
                  {profile?.weight && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Weight (kg)</p>
                      <p className="text-sm text-slate-300">{profile.weight}</p>
                    </div>
                  )}
                  {profile?.height && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Height (cm)</p>
                      <p className="text-sm text-slate-300">{profile.height}</p>
                    </div>
                  )}
                  {profile?.goal && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Goal</p>
                      <p className="text-sm text-slate-300">{profile.goal}</p>
                    </div>
                  )}
                </div>
                {!profile?.bio && !profile?.phone && !profile?.weight && !profile?.height && !profile?.goal && (
                  <p className="text-sm text-slate-500 italic">No profile information yet. Click "Edit Profile" to add your details.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6 max-w-2xl">
              {/* Photo upload */}
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-3xl font-black text-black shadow-lg overflow-hidden relative shrink-0">
                  {form.photoUrl ? (
                    <Image src={form.photoUrl} alt="" fill className="object-cover" />
                  ) : (
                    user?.email?.[0].toUpperCase() || "U"
                  )}
                </div>
                <div className="space-y-2">
                  <UploadButton onUpload={(url) => setForm((f) => ({ ...f, photoUrl: url }))} />
                  {form.photoUrl && (
                    <button onClick={() => setForm((f) => ({ ...f, photoUrl: "" }))}
                      className="text-xs text-red-400 hover:text-red-300 block"
                    >
                      Remove photo
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Full Name</label>
                  <input type="text" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                    className="input-field w-full" placeholder="Your full name"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Phone</label>
                  <input type="text" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="input-field w-full" placeholder="+213 555 123 456"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Weight (kg)</label>
                  <input type="number" value={form.weight} onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
                    className="input-field w-full" placeholder="e.g. 75"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Height (cm)</label>
                  <input type="number" value={form.height} onChange={(e) => setForm((f) => ({ ...f, height: e.target.value }))}
                    className="input-field w-full" placeholder="e.g. 175"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs text-slate-400 mb-1">Goal</label>
                  <select value={form.goal} onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))} className="input-field w-full">
                    <option value="">Select a goal</option>
                    <option value="Lose weight">Lose weight</option>
                    <option value="Build muscle">Build muscle</option>
                    <option value="Improve endurance">Improve endurance</option>
                    <option value="General fitness">General fitness</option>
                    <option value="Flexibility">Flexibility</option>
                    <option value="Sports performance">Sports performance</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs text-slate-400 mb-1">Bio</label>
                  <textarea value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                    className="input-field w-full" rows={3} placeholder="Tell us about yourself..."
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PLANS TAB */}
      {activeTab === "plans" && (
        <div className="glass p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">🤖 {t("ai.myPlans")}</h2>
            <Link href="/ai" className="btn-primary px-4 py-2 text-xs">✨ {t("dashboard.generatePlan")}</Link>
          </div>

          {plansLoading ? (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {[1, 2, 3].map((i) => <div key={i} className="min-w-[220px] h-32 rounded-xl bg-slate-800/40 animate-pulse shrink-0" />)}
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3 opacity-60">📋</div>
              <p className="text-slate-400 text-sm mb-4">{t("ai.noPlans")}</p>
              <Link href="/ai" className="btn-primary inline-block px-6 py-2 text-sm">{t("ai.generatePlan")}</Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.map((p) => (
                <div key={p.id} className="glass rounded-2xl border border-white/5 p-5 hover:border-emerald-500/30 transition-all group relative">
                  {p.isActive && (
                    <div className="absolute -top-2 -right-2 px-2.5 py-0.5 bg-emerald-500 text-[9px] font-bold text-white rounded-full shadow-lg shadow-emerald-500/30">
                      {t("ai.activePlan")}
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-white/5 flex items-center justify-center text-lg">🥗</div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-white text-sm truncate">{p.title || "Plan"}</h3>
                      <p className="text-[10px] text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mb-3 text-xs">
                    <span className="text-slate-400">🔥 {p.calories} kcal</span>
                    {p.workoutPlace && <span className="text-slate-500">{p.workoutPlace === "gym" ? "🏋️" : "🏠"}</span>}
                  </div>
                  {p.scheduledDate && <p className="text-[10px] text-emerald-400/80 mb-2">📅 Scheduled: {new Date(p.scheduledDate).toLocaleDateString()}</p>}
                  <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-white/5">
                    <Link href={`/plan/${p.id}`} className="btn-ghost !py-1 !px-2.5 text-[11px]">{t("ai.viewPlan")}</Link>
                    <button onClick={() => !p.isActive && handleSetActive(p.id)}
                      className={`!py-1 !px-2.5 text-[11px] rounded-lg font-semibold transition ${p.isActive ? "text-emerald-400 bg-emerald-500/10 cursor-default" : "btn-ghost"}`}
                    >
                      {p.isActive ? "✅" : "📌"} {t("ai.activePlan")}
                    </button>
                    <input type="date" onChange={(e) => handleSchedule(p.id, e.target.value)} disabled={schedulingId === p.id}
                      className="!py-1 !px-2 text-[11px] rounded-lg bg-white/[0.03] border border-white/5 text-slate-300 w-auto" title={t("ai.schedulePlan")}
                    />
                    <button onClick={() => handleDeletePlan(p.id)} disabled={deletingId === p.id}
                      className="!py-1 !px-2 text-[11px] rounded-lg text-red-400 hover:bg-red-500/10 transition disabled:opacity-50 ml-auto"
                    >
                      {deletingId === p.id ? "..." : "🗑️"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* WALLET TAB */}
      {activeTab === "wallet" && (
        <div className="glass-card-premium p-8 relative overflow-hidden border border-white/10">
          <div className="absolute top-0 right-0 w-60 h-60 bg-emerald-500/5 rounded-full filter blur-3xl pointer-events-none" />
          <div className="flex flex-col lg:flex-row justify-between items-stretch gap-8">
            <div className="flex-1 max-w-sm rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 p-6 flex flex-col justify-between shadow-2xl relative min-h-[160px] select-none">
              <div className="absolute inset-0 grid-dots opacity-10 rounded-2xl" />
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold font-sans">AthletiX Wallet</p>
                  <p className="text-2xl font-black text-white mt-1 tracking-tight">{fDZD(balance)}</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xs">💳</div>
              </div>
              <div className="mt-8 flex justify-between items-end">
                <span className="text-[10px] text-slate-500 tracking-wider font-mono truncate max-w-[200px]">{user?.email}</span>
                <span className="text-[9px] text-emerald-400 font-extrabold tracking-widest uppercase">ACTIVE</span>
              </div>
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <h2 className="text-xl font-bold text-slate-200 mb-2 flex items-center gap-2">💰 {t("dashboard.myWallet")}</h2>
              <p className="text-xs text-slate-400 mb-4 font-sans">Add funds to purchase personalized training or nutrition services directly from our verified coaches.</p>
              {walletMsg && (
                <div className={`p-3 glass-sm text-xs rounded-lg mb-4 ${walletMsg.includes("successfully") || walletMsg.includes("held") ? "border border-emerald-500/20 text-emerald-400" : "border border-red-500/20 text-red-400"}`}>
                  {walletMsg}
                </div>
              )}
              <div className="flex gap-3">
                <input type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)}
                  className="input-field max-w-xs text-sm" placeholder={t("dashboard.depositAmount")} min="1" step="0.01"
                  onKeyDown={(e) => { if (e.key === "Enter") handleDeposit(); }} autoComplete="off"
                />
                <button onClick={handleDeposit} disabled={depositing || !depositAmount} className="btn-primary disabled:opacity-50 text-xs py-2 px-5 font-bold cursor-pointer">
                  {depositing ? "..." : t("dashboard.deposit")}
                </button>
              </div>
            </div>
          </div>
          {transactions.length > 0 && (
            <>
              <h3 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider mt-8">{t("dashboard.recentTransactions")}</h3>
              <div className="divide-y divide-slate-800">
                {transactions.slice(0, 10).map((tx) => (
                  <div key={tx.id} className="py-3 flex items-center justify-between group hover:bg-white/5 px-3 rounded-lg transition">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{transIcon[tx.type] || "💳"}</span>
                      <div>
                        <p className="text-sm font-semibold text-white">{tx.description || tx.type}</p>
                        <p className="text-[10px] text-slate-500">{new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${tx.type === "DEPOSIT" || tx.type === "RELEASE" || tx.type === "REFUND" ? "text-emerald-400" : "text-red-400"}`}>
                      {tx.type === "DEPOSIT" || tx.type === "RELEASE" || tx.type === "REFUND" ? "+" : "-"}{fDZD(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ORDERS TAB */}
      {activeTab === "orders" && (
        <div className="glass p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">{t("dashboard.yourOrders")}</h2>
            <span className="text-xs text-slate-500">{orders.length} {t("common.total")}</span>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4 opacity-80">📦</div>
              <p className="text-slate-400 mb-6">{t("dashboard.noOrders")}</p>
              <Link href="/marketplace" className="btn-primary inline-block px-6 py-2">{t("dashboard.browseServices")}</Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {orders.map((order) => {
                const expertId = order.service.expert?.id || order.service.expertId || "";
                const expertName = order.service.expert?.profile?.fullName || order.service.expert?.email || "Expert";
                const isPending = order.paymentStatus === "PENDING";
                const isHeld = order.paymentStatus === "HELD";
                return (
                  <div key={order.id} className="py-4 group hover:bg-white/5 px-3 rounded-lg transition">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        {order.service.imageUrl && (
                          <Image src={order.service.imageUrl} alt="" width={40} height={40} className="w-10 h-10 rounded-lg object-cover border border-white/5 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <h3 className="font-semibold text-white group-hover:text-emerald-300 transition truncate">{order.service.title}</h3>
                          <p className="text-xs text-slate-500 mt-1">{fDZD(order.service.price)} • {new Date(order.createdAt).toLocaleDateString()}</p>
                          {expertId && <p className="text-[10px] text-slate-600 mt-0.5">{t("dashboard.withExpert", { name: expertName })}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {expertId && (
                          <Link href={`/messages?expertId=${expertId}`}
                            className="btn-ghost !py-1.5 !px-3 text-xs opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                          >💬 {t("dashboard.chat")}</Link>
                        )}
                        <div className="flex items-center gap-1.5">
                          {paymentStatusBadge(order.paymentStatus)}
                          <span className={`badge ${statusColor[order.status] || "badge-blue"}`}>{t("dashboard." + order.status)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
                      {isPending && (
                        <button onClick={() => handlePay(order.id)} disabled={payingId === order.id}
                          className="btn-primary !py-1.5 !px-4 text-xs disabled:opacity-50"
                        >{payingId === order.id ? "..." : t("dashboard.payNow")}</button>
                      )}
                      {isHeld && (
                        <button onClick={() => handleConfirmRelease(order)} disabled={confirmingId === order.id}
                          className="btn-primary !py-1.5 !px-4 text-xs bg-gradient-to-r from-emerald-500 to-cyan-500 disabled:opacity-50"
                        >{confirmingId === order.id ? "..." : t("dashboard.confirmDelivery")}</button>
                      )}
                      {!isPending && !isHeld && expertId && (
                        <Link href={`/messages?expertId=${expertId}`} className="btn-ghost !py-1.5 !px-3 text-xs">💬 {t("dashboard.chat")}</Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* REVIEW MODAL */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="glass max-w-lg w-full p-8 rounded-2xl shadow-2xl border border-slate-700/50 animate-scale-in">
            {modalView === "rate" && (
              <>
                <div className="text-center mb-6">
                  <div className="text-5xl mb-3">⭐</div>
                  <h2 className="text-2xl font-bold text-white">{t("review.title")}</h2>
                  <p className="text-slate-400 text-sm mt-1">{reviewModal.serviceTitle}</p>
                  <p className="text-slate-500 text-xs">{t("dashboard.withExpert", { name: reviewModal.expertName })}</p>
                </div>
                <div className="mb-6 text-center">
                  <p className="text-sm font-semibold text-slate-300 mb-3">{t("review.rating")}</p>
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} onClick={() => setModalRating(star)}
                        onMouseEnter={() => setModalHover(star)} onMouseLeave={() => setModalHover(0)}
                        className="transition-all hover:scale-125 focus:outline-none"
                      >
                        <StarIcon size={36}
                          className={star <= (modalHover || modalRating) ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" : "text-slate-600 hover:text-amber-300/50"}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-6">
                  <textarea value={modalComment} onChange={(e) => setModalComment(e.target.value)}
                    className="input-field w-full" rows={3} placeholder={t("review.commentPlaceholder")}
                  />
                </div>
                {modalError && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg mb-4">{modalError}</div>}
                <div className="flex gap-3">
                  <button onClick={handleModalReviewSubmit} disabled={modalSubmitting || modalRating === 0}
                    className="btn-primary flex-1 disabled:opacity-50"
                  >{modalSubmitting ? t("review.submitting") : t("review.submit")}</button>
                  <button onClick={closeModal} className="btn-ghost px-5">{t("common.cancel")}</button>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-700/30 text-center">
                  <button onClick={() => setModalView("report")}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors font-medium"
                  >⚠️ {t("dashboard.reportCoach")}</button>
                </div>
              </>
            )}
            {modalView === "report" && (
              <>
                <div className="text-center mb-6">
                  <div className="text-5xl mb-3">⚠️</div>
                  <h2 className="text-2xl font-bold text-white">{t("report.title")}</h2>
                  <p className="text-slate-400 text-sm mt-1">{reviewModal.serviceTitle}</p>
                </div>
                <div className="mb-4">
                  <select value={modalReportReason} onChange={(e) => setModalReportReason(e.target.value)} className="input-field w-full">
                    <option value="">{t("report.reasonSelect")}</option>
                    <option value="Scam or fraudulent">{t("report.reasonScam")}</option>
                    <option value="Harassment or abuse">{t("report.reasonHarassment")}</option>
                    <option value="Unprofessional behavior">{t("report.reasonUnprofessional")}</option>
                    <option value="Other">{t("report.reasonOther")}</option>
                  </select>
                </div>
                <div className="mb-6">
                  <textarea value={modalReportDesc} onChange={(e) => setModalReportDesc(e.target.value)}
                    className="input-field w-full" rows={3} placeholder={t("report.descriptionPlaceholder")}
                  />
                </div>
                {modalReportMsg && (
                  <div className={`p-3 text-sm rounded-lg mb-4 ${modalReportMsg.includes("success") ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border border-red-500/20 text-red-400"}`}>
                    {modalReportMsg}
                  </div>
                )}
                <div className="flex gap-3">
                  <button onClick={handleModalReportSubmit} disabled={modalReportSubmitting || !modalReportReason}
                    className="btn-primary flex-1 bg-gradient-to-r from-red-500 to-pink-500 disabled:opacity-50"
                  >{modalReportSubmitting ? "..." : t("report.submit")}</button>
                  <button onClick={() => setModalView("rate")} className="btn-ghost px-5">{t("common.back")}</button>
                </div>
              </>
            )}
            {modalView === "done" && (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">✅</div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {modalRating > 0 ? t("review.success") : t("report.success")}
                </h2>
                <button onClick={closeModal} className="btn-primary mt-6 px-8">{t("common.back")}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
