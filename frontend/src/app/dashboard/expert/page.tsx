"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { serviceAPI, profileAPI, messageAPI, uploadAPI, orderAPI, paymentAPI, sportCategoryAPI } from "@/lib/api";
import { getUser, isLoggedIn, getToken } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fDZD } from "@/lib/format";
import { useLocale } from "@/i18n/LocaleContext";
import Image from "next/image";
import { connectSocket, getSocket, disconnectSocket } from "@/lib/socket";
import {
  createPeerConnection, startLocalStream, stopLocalStream,
  createOffer, createAnswer, setRemoteDescription, addIceCandidate,
} from "@/lib/webrtc";
import VideoCallOverlay from "@/components/video-call/VideoCallOverlay";
import IncomingCallModal from "@/components/video-call/IncomingCallModal";

// ─── Types ───
interface Profile {
  id: string;
  fullName: string | null;
  bio: string | null;
  specialization: string | null;
  phone: string | null;
  photoUrl: string | null;
  portfolioPhotos: string[];
  achievements: string[];
  certifications: string[];
  yearsExperience: number | null;
}

interface Conversation {
  partnerId: string;
  partnerEmail: string;
  partnerRole: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface ChatMessage {
  id: string;
  senderId: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  sender: { id: string; email: string };
}

type TabKey = "profile" | "services" | "orders" | "chat" | "wallet";

export default function ExpertDashboard() {
  const router = useRouter();
  const { t } = useLocale();

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: "profile", label: t("profile.title"), icon: "👤" },
    { key: "services", label: t("services.title"), icon: "🏷️" },
    { key: "orders", label: t("orders.title"), icon: "📦" },
    { key: "chat", label: t("nav.messages"), icon: "💬" },
    { key: "wallet", label: t("dashboard.wallet"), icon: "💰" },
  ];
  const [user, setUser] = useState<{ email: string; role: string; id?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("profile");
  const [tabIndicator, setTabIndicator] = useState({ left: 0, width: 0 });
  const tabBarRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    if (isLoggedIn()) setUser(getUser());
    else router.push("/login");
    const params = new URLSearchParams(window.location.search);
    if (params.get("chat")) setActiveTab("chat");
  }, []);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
    }
  }, []);

  useEffect(() => {
    const el = tabRefs.current[activeTab];
    if (el && tabBarRef.current) {
      const barRect = tabBarRef.current.getBoundingClientRect();
      const rect = el.getBoundingClientRect();
      setTabIndicator({ left: rect.left - barRect.left, width: rect.width });
    }
  }, [activeTab]);

  return (
    <div className="max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="relative mb-10 overflow-hidden rounded-3xl glass border border-white/5 p-8 md:p-10 animate-fade-up">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="relative flex items-center justify-between flex-wrap gap-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-2xl font-black text-white shadow-xl shadow-orange-500/20 ring-2 ring-white/10">
                {user?.email?.[0].toUpperCase() || "E"}
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-[3px] border-[#050a18] shadow-lg shadow-emerald-500/30" />
            </div>
            <div>
              <h1 className="text-3xl font-black gradient-text-warm tracking-tight">{t("dashboard.expertTitle")}</h1>
              <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                {user?.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 glass-sm px-4 py-2 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-400 font-medium">{t("dashboard.expertAccount")}</span>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div ref={tabBarRef} className="relative flex gap-1 mb-8 animate-fade-up-d1 overflow-x-auto p-1 glass rounded-2xl border border-white/5">
        <div
          className="absolute bottom-1 top-1 rounded-xl bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 transition-all duration-400 ease-out shadow-[0_0_20px_rgba(16,185,129,0.1)]"
          style={{ left: tabIndicator.left, width: tabIndicator.width }}
        />
        {tabs.map((tab) => (
          <button
            key={tab.key}
            ref={(el) => { tabRefs.current[tab.key] = el; }}
            onClick={() => setActiveTab(tab.key)}
            className={`relative z-10 flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-300 whitespace-nowrap ${
              activeTab === tab.key
                ? "text-white"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
            }`}
          >
            <span className={`${activeTab === tab.key ? "scale-110" : ""} transition-transform duration-300`}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div className="animate-fade-up-d2">
        {activeTab === "profile" && <ProfileTab />}
        {activeTab === "services" && <ServicesTab />}
        {activeTab === "orders" && <OrdersTab />}
        {activeTab === "chat" && <ChatTab />}
        {activeTab === "wallet" && <WalletTab />}
      </div>
    </div>
  );
}

/* ─── UPLOAD BUTTON ─── */
function UploadButton({ onUpload, accept = "image/*", label = "Upload" }: { onUpload: (url: string) => void; accept?: string; label?: string }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadAPI.uploadFile(file);
      onUpload(res.url);
    } catch {}
    setUploading(false);
  };

  return (
    <>
      <input ref={inputRef} type="file" accept={accept} onChange={handleChange} className="hidden" />
      <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
        className="relative overflow-hidden group btn-ghost !py-1.5 !px-4 text-xs disabled:opacity-50"
      >
        <span className="relative z-10 flex items-center gap-1.5">
          {uploading ? (
            <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          )}
          {uploading ? "Uploading..." : label}
        </span>
      </button>
    </>
  );
}

/* ─── ANIMATED COUNTER ─── */
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

/* ═══════════════════════════════════════════════════
   PROFILE TAB
   ═══════════════════════════════════════════════════ */
function ProfileTab() {
  const { t } = useLocale();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [editMode, setEditMode] = useState(false);

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [phone, setPhone] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [achievements, setAchievements] = useState<string[]>([]);
  const [certifications, setCertifications] = useState<string[]>([]);
  const [portfolioPhotos, setPortfolioPhotos] = useState<string[]>([]);

  const [newAchievement, setNewAchievement] = useState("");
  const [newCertification, setNewCertification] = useState("");
  const [newPhoto, setNewPhoto] = useState("");

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const data = await profileAPI.getMyProfile();
      setProfile(data);
      setFullName(data.fullName || "");
      setBio(data.bio || "");
      setSpecialization(data.specialization || "");
      setPhone(data.phone || "");
      setPhotoUrl(data.photoUrl || "");
      setYearsExperience(data.yearsExperience?.toString() || "");
      setAchievements(data.achievements || []);
      setCertifications(data.certifications || []);
      setPortfolioPhotos(data.portfolioPhotos || []);
    } catch {}
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true); setMsg("");
    try {
      const res = await profileAPI.updateProfile({ fullName, bio, specialization, phone, photoUrl, yearsExperience: yearsExperience ? Number(yearsExperience) : null, achievements, certifications, portfolioPhotos });
      setProfile(res.profile);
      setMsg(t("profile.savedSuccess"));
      setEditMode(false);
    } catch (err: unknown) { setMsg((err as Error).message); }
    finally { setSaving(false); }
  };

  const addItem = (value: string, setter: React.Dispatch<React.SetStateAction<string>>, list: string[], listSetter: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (value.trim()) { listSetter([...list, value.trim()]); setter(""); }
  };

  const removeItem = (index: number, list: string[], listSetter: React.Dispatch<React.SetStateAction<string[]>>) => {
    listSetter(list.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="grid md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-64 rounded-2xl bg-slate-800/30 animate-pulse" />
        ))}
    </div>
  );
}

  // ─── VIEW MODE ───
  if (!editMode) {
    return (
      <div className="space-y-8">
        {msg && (
          <div className="p-4 glass-sm text-sm rounded-xl border border-emerald-500/20 text-emerald-400 flex items-center gap-3">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
            {msg}
          </div>
        )}

        {/* Profile Hero Card */}
        <div className="relative overflow-hidden rounded-3xl glass border border-white/5 p-0 shadow-lg">
          {/* Banner background */}
          <div className="w-full h-40 bg-gradient-to-r from-emerald-500/20 via-cyan-500/10 to-purple-500/20 relative overflow-hidden">
            <div className="absolute inset-0 grid-dots opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050a18] to-transparent" />
            <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.2)] animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Verified Expert
            </div>
          </div>
          
          <div className="p-8 md:p-10 pt-0 relative z-10 -mt-16">
            <div className="relative flex items-end justify-between flex-wrap gap-6">
              <div className="flex items-end gap-6 flex-wrap md:flex-nowrap">
                <div className="relative group">
                  <div className="w-28 h-28 rounded-2xl overflow-hidden ring-4 ring-emerald-500/30 shadow-2xl shadow-black/80 transition-transform duration-300 group-hover:scale-[1.02] bg-[#050a18] relative">
                    {photoUrl ? (
                      <Image src={photoUrl} alt="Profile" fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-4xl font-black text-white">
                        {fullName?.[0]?.toUpperCase() || "E"}
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-[3px] border-[#050a18] shadow-lg shadow-emerald-500/30" />
                </div>
                <div className="mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-3xl font-black text-white tracking-tight">{fullName || t("profile.setNamePlaceholder")}</h2>
                    <span className="w-5 h-5 text-emerald-400 animate-pulse-glow flex items-center justify-center">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a.75.75 0 00-.708-.523H4.5a2.5 2.5 0 00-2.5 2.5v1.059a.75.75 0 00.523.708L3.5 7.5v5l-1.023.341A.75.75 0 002 13.55v1.059A2.5 2.5 0 004.5 17.17h1.059a.75.75 0 00.708-.523L6.5 16.5h7l.233.147a.75.75 0 00.708.523h1.059a2.5 2.5 0 002.5-2.5v-1.059a.75.75 0 00-.523-.708L16.5 12.5v-5l1.023-.341A.75.75 0 0018 6.45V5.39a2.5 2.5 0 00-2.5-2.5h-1.059a.75.75 0 00-.708.523L13.5 3.5h-7zM12 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="flex items-center gap-1.5 text-emerald-400 text-sm font-semibold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                      {specialization || t("profile.addSpecPlaceholder")}
                    </span>
                    {yearsExperience && (
                      <span className="text-slate-400 text-xs bg-white/[0.04] border border-white/5 px-3 py-1 rounded-full">
                        {yearsExperience} {t("profile.yearsExpSuffix")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => setEditMode(true)}
                className="group flex items-center gap-2 btn-ghost !py-2.5 !px-5 text-sm rounded-xl hover:bg-emerald-500/10 hover:border-emerald-500/20 border border-white/5 transition-all duration-300 self-end mb-2 cursor-pointer"
              >
                <svg className="w-4 h-4 transition-transform group-hover:rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                {t("profile.editProfile")}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-10">
              {[
                { value: achievements.length, label: t("profile.achievements"), color: "text-emerald-400", border: "border-t-emerald-500/40" },
                { value: certifications.length, label: t("profile.certifications"), color: "text-blue-400", border: "border-t-blue-500/40" },
                { value: portfolioPhotos.length, label: t("profile.photos"), color: "text-purple-400", border: "border-t-purple-500/40" },
              ].map((stat) => (
                <div key={stat.label} className={`glass-sm p-5 text-center border-t-2 ${stat.border} hover:bg-white/[0.03] transition-all duration-300 rounded-xl`}>
                  <p className={`text-3xl font-black ${stat.color}`}><AnimatedCounter value={stat.value} /></p>
                  <p className="text-[10px] text-slate-500 mt-1.5 font-bold uppercase tracking-wider">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* About & Contact */}
        <div className="grid md:grid-cols-3 gap-6">
          {bio && (
            <div className="md:col-span-2 glass rounded-2xl p-7 border border-white/5 hover:border-white/10 transition-all duration-300">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                {t("profile.aboutMe")}
              </h3>
              <p className="text-slate-300 leading-relaxed text-sm">{bio}</p>
            </div>
          )}
          {phone && (
            <div className="glass rounded-2xl p-7 border border-white/5 hover:border-white/10 transition-all duration-300">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                {t("profile.contact")}
              </h3>
              <p className="text-slate-300 text-sm flex items-center gap-2">
                <span className="text-lg">📞</span> {phone}
              </p>
            </div>
          )}
        </div>

        {/* Achievements */}
        {achievements.length > 0 && (
          <div className="glass rounded-2xl p-7 border border-white/5 hover:border-white/10 transition-all duration-300">
            <h3 className="text-sm font-bold text-white mb-5 flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-sm">🏆</span>
              {t("profile.achievements")}
            </h3>
            <div className="flex flex-wrap gap-2">
              {achievements.map((a, i) => (
                <span key={i} className="badge badge-emerald text-sm py-2 px-4 rounded-xl shadow-sm hover:scale-[1.02] transition-transform duration-200">
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Certifications */}
        {certifications.length > 0 && (
          <div className="glass rounded-2xl p-7 border border-white/5 hover:border-white/10 transition-all duration-300">
            <h3 className="text-sm font-bold text-white mb-5 flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center text-sm">📜</span>
              {t("profile.certifications")}
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {certifications.map((c, i) => (
                <div key={i} className="flex items-center gap-3 glass-sm p-4 rounded-xl border border-white/[0.03] hover:border-emerald-500/10 transition-all duration-300">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center text-sm flex-shrink-0">✅</div>
                  <span className="text-slate-300 text-sm font-medium">{c}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Portfolio */}
        {portfolioPhotos.length > 0 && (
          <div className="glass rounded-2xl p-7 border border-white/5 hover:border-white/10 transition-all duration-300">
            <h3 className="text-sm font-bold text-white mb-5 flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center text-sm">📸</span>
              {t("profile.portfolio")}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {portfolioPhotos.map((photo, i) => (
                <div key={i} className="group relative aspect-square rounded-xl overflow-hidden border border-white/5 hover:border-emerald-500/30 transition-all duration-500">
<Image src={photo} alt={`Portfolio ${i + 1}`} fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
              ))}
            </div>
        </div>
      )}
    </div>
  );
}

  // ─── EDIT MODE ───
  return (
    <div className="space-y-8">
      {/* Edit Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">{t("profile.editProfile")}</h2>
          <p className="text-slate-400 text-sm mt-1">Update your professional information</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setEditMode(false)} className="btn-ghost !py-2.5 !px-5 text-sm rounded-xl border border-white/5 hover:bg-white/5 transition-all">
            {t("profile.cancel")}
          </button>
          <button onClick={handleSave} disabled={saving}
            className="btn-primary !py-2.5 !px-6 text-sm rounded-xl disabled:opacity-50 shadow-lg shadow-emerald-500/20"
          >
            <span className="flex items-center gap-2">
              {saving ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              )}
              {saving ? t("profile.saving") : t("profile.saveProfile")}
            </span>
          </button>
        </div>
      </div>

      {/* Basic Info */}
      <div className="glass rounded-2xl p-8 border border-emerald-500/10">
        <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-sm">👤</span>
          {t("profile.basicInfo")}
        </h3>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">{t("profile.fullName")}</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field" placeholder={t("profile.fullName")} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">{t("profile.specialization")}</label>
            <input value={specialization} onChange={(e) => setSpecialization(e.target.value)} className="input-field" placeholder={t("profile.specialization")} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">{t("profile.phone")}</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input-field" placeholder={t("profile.phone")} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">{t("profile.yearsExperience")}</label>
            <input type="number" value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} className="input-field" placeholder={t("profile.yearsExperience")} />
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">{t("profile.profilePhoto")}</label>
          <div className="flex items-center gap-4">
            {photoUrl ? (
              <Image src={photoUrl} alt="Preview" width={64} height={64} className="w-16 h-16 rounded-xl object-cover border-2 border-emerald-500/20 shadow-lg" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-slate-700/50 flex items-center justify-center text-slate-500 text-sm border border-white/5">{t("profile.noPhoto")}</div>
            )}
            <div className="flex-1 flex items-center gap-2">
              <input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} className="input-field flex-1 text-sm" placeholder={t("profile.pasteUrl")} />
              <UploadButton onUpload={(url) => setPhotoUrl(url)} label={t("profile.upload")} />
            </div>
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">{t("profile.bio")}</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="input-field min-h-[120px] resize-none" placeholder={t("profile.bioPlaceholder")} />
        </div>
      </div>

      {/* Achievements */}
      <div className="glass rounded-2xl p-8 border border-emerald-500/10">
        <h3 className="text-sm font-bold text-white mb-5 flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-sm">🏆</span>
          {t("profile.achievements")}
        </h3>
        <div className="flex gap-2 mb-4">
          <input value={newAchievement} onChange={(e) => setNewAchievement(e.target.value)}
            className="input-field flex-1" placeholder={t("profile.achievementPlaceholder")}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(newAchievement, setNewAchievement, achievements, setAchievements); }}}
          />
          <button onClick={() => addItem(newAchievement, setNewAchievement, achievements, setAchievements)}
            className="btn-primary !py-2 !px-5 text-sm rounded-xl"
          >
            <span className="flex items-center gap-1.5">{t("profile.addAchievement")}</span>
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {achievements.map((a, i) => (
            <span key={i} className="badge badge-emerald text-sm py-2 px-4 rounded-xl flex items-center gap-2 group hover:scale-[1.02] transition-transform">
              {a}
              <button onClick={() => removeItem(i, achievements, setAchievements)}
                className="opacity-50 hover:opacity-100 text-red-400 transition-all ml-1"
              >×</button>
            </span>
          ))}
          {achievements.length === 0 && <p className="text-slate-500 text-sm italic">{t("profile.noAchievements")}</p>}
        </div>
      </div>

      {/* Certifications */}
      <div className="glass rounded-2xl p-8 border border-emerald-500/10">
        <h3 className="text-sm font-bold text-white mb-5 flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center text-sm">📜</span>
          {t("profile.certifications")}
        </h3>
        <div className="flex gap-2 mb-4">
          <input value={newCertification} onChange={(e) => setNewCertification(e.target.value)}
            className="input-field flex-1" placeholder={t("profile.certificationPlaceholder")}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(newCertification, setNewCertification, certifications, setCertifications); }}}
          />
          <button onClick={() => addItem(newCertification, setNewCertification, certifications, setCertifications)}
            className="btn-primary !py-2 !px-5 text-sm rounded-xl"
          >
            <span className="flex items-center gap-1.5">{t("profile.addCertification")}</span>
          </button>
        </div>
        <div className="space-y-2">
          {certifications.map((c, i) => (
            <div key={i} className="flex items-center justify-between glass-sm p-4 rounded-xl border border-white/[0.03] hover:border-emerald-500/10 transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center text-sm flex-shrink-0">✅</div>
                <span className="text-slate-300 text-sm font-medium">{c}</span>
              </div>
              <button onClick={() => removeItem(i, certifications, setCertifications)}
                className="text-red-400/60 hover:text-red-400 transition-colors text-sm px-3 py-1 rounded-lg hover:bg-red-500/10"
              >
                {t("profile.remove")}
              </button>
            </div>
          ))}
          {certifications.length === 0 && <p className="text-slate-500 text-sm italic">{t("profile.noCertifications")}</p>}
        </div>
      </div>

      {/* Portfolio Photos */}
      <div className="glass rounded-2xl p-8 border border-emerald-500/10">
        <h3 className="text-sm font-bold text-white mb-5 flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center text-sm">📸</span>
          {t("profile.portfolio")}
        </h3>
        <div className="flex gap-2 mb-4">
          <input value={newPhoto} onChange={(e) => setNewPhoto(e.target.value)}
            className="input-field flex-1" placeholder={t("profile.photoPlaceholder")}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(newPhoto, setNewPhoto, portfolioPhotos, setPortfolioPhotos); }}}
          />
          <UploadButton onUpload={(url) => { setPortfolioPhotos([...portfolioPhotos, url]); }} label={t("profile.upload")} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {portfolioPhotos.map((photo, i) => (
            <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-white/5 hover:border-emerald-500/30 transition-all duration-500">
              <Image src={photo} alt={`Portfolio ${i + 1}`} fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <button onClick={() => removeItem(i, portfolioPhotos, setPortfolioPhotos)}
                  className="bg-red-500/80 text-white text-xs px-4 py-2 rounded-full hover:bg-red-500 transition shadow-lg"
                >
                  {t("profile.remove")}
                </button>
              </div>
            </div>
          ))}
          {portfolioPhotos.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-500 text-sm italic border-2 border-dashed border-white/5 rounded-xl">
              {t("profile.noPortfolio")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SERVICES TAB
   ═══════════════════════════════════════════════════ */
function ServicesTab() {
  const { t } = useLocale();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState("NUTRITION");
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"success" | "error">("success");
  const [sports, setSports] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => { loadServices(); sportCategoryAPI.getAll().then(setSports).catch(() => {}); }, []);

  const loadServices = async () => {
    try { const all = await serviceAPI.getAll(); setServices(all); } catch {}
  };

  const startEdit = (s: any) => {
    setEditingId(s.id);
    setEditForm({
      title: s.title,
      description: s.description,
      price: s.price,
      imageUrl: s.imageUrl || "",
      category: s.category || "NUTRITION",
      sportId: s.sportId || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleEditSave = async (id: string) => {
    setSavingEdit(true);
    setMsg("");
    try {
      await serviceAPI.update(id, editForm);
      setMsg(t("services.createdSuccess"));
      setMsgType("success");
      setEditingId(null);
      setEditForm({});
      loadServices();
    } catch (err: unknown) {
      setMsg((err as Error).message);
      setMsgType("error");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setMsg("");
    try {
      await serviceAPI.create(title, description, Number(price), imageUrl || undefined, category);
      setMsg(t("services.createdSuccess"));
      setMsgType("success");
      setTitle(""); setDescription(""); setPrice(""); setImageUrl(""); setCategory("NUTRITION");
      setShowForm(false);
      loadServices();
    } catch (err: unknown) { setMsg((err as Error).message); setMsgType("error"); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">{t("services.title")}</h2>
          <p className="text-slate-400 text-sm mt-1">{services.length} {t("services.subtitle")}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className={`btn-primary !py-2.5 !px-6 text-sm rounded-xl shadow-lg transition-all duration-300 ${showForm ? "!bg-red-500/20 !text-red-400 !border-red-500/30" : "shadow-emerald-500/20"}`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {showForm
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              }
            </svg>
            {showForm ? t("services.cancel") : t("services.newService")}
          </span>
        </button>
      </div>

      {msg && (
        <div className={`p-4 glass-sm text-sm rounded-xl flex items-center gap-3 ${
          msgType === "success" ? "border border-emerald-500/20 text-emerald-400" : "border border-red-500/20 text-red-400"
        }`}>
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            {msgType === "success"
              ? <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              : <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            }
          </svg>
          {msg}
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div className="glass rounded-2xl p-8 border border-emerald-500/10 animate-fade-up">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-sm">✨</span>
            {t("services.createTitle")}
          </h3>
          <form onSubmit={handleCreate} className="flex flex-col gap-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">{t("services.serviceTitle")}</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="input-field" placeholder={t("services.serviceTitlePlaceholder")} required />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">{t("services.description")}</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-field min-h-[120px] resize-none" placeholder={t("services.descriptionPlaceholder")} required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">{t("services.price")}</label>
                <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="input-field" placeholder="49" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">{t("services.category")}</label>
                <div className="grid grid-cols-2 gap-2 h-[42px]">
                  <button type="button" onClick={() => setCategory("NUTRITION")}
                    className={`rounded-xl text-xs font-semibold transition-all duration-300 border ${category === "NUTRITION" ? "border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-sm" : "border-white/5 bg-white/[0.02] text-slate-400 hover:border-white/10"}`}
                  >
                    🥗 {t("marketplace.nutrition")}
                  </button>
                  <button type="button" onClick={() => setCategory("SPORTS")}
                    className={`rounded-xl text-xs font-semibold transition-all duration-300 border ${category === "SPORTS" ? "border-amber-500 bg-amber-500/10 text-amber-400 shadow-sm" : "border-white/5 bg-white/[0.02] text-slate-400 hover:border-white/10"}`}
                  >
                    🏋️ {t("marketplace.sports")}
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">{t("services.serviceImage")}</label>
              <div className="flex gap-2">
                <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="input-field flex-1" placeholder={t("services.pasteImageUrl")} />
                <UploadButton onUpload={(url) => setImageUrl(url)} label={t("profile.upload")} />
              </div>
              {imageUrl && (
                <div className="mt-3 w-32 h-20 rounded-xl overflow-hidden border border-white/5 shadow-lg relative">
                  <Image src={imageUrl} alt="Preview" fill className="object-cover" />
                </div>
              )}
            </div>
            <button type="submit" disabled={loading}
              className="btn-primary disabled:opacity-50 !py-3 text-sm rounded-xl shadow-lg shadow-emerald-500/20"
            >
              <span className="flex items-center justify-center gap-2">
                {loading ? (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                )}
                {loading ? t("services.creating") : t("services.publish")}
              </span>
            </button>
          </form>
        </div>
      )}

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-5">
        {[
          { value: services.length, label: t("services.totalServices"), color: "text-emerald-400", border: "border-t-emerald-500", icon: "🏷️" },
          { value: t("services.active"), label: t("common.status"), color: "text-emerald-400", border: "border-t-blue-500", icon: "✅", isString: true },
          { value: "EXPERT", label: t("services.accountType"), color: "text-purple-400", border: "border-t-purple-500", icon: "👑", isString: true },
        ].map((stat) => (
          <div key={stat.label} className={`glass p-6 border-t-2 ${stat.border} rounded-2xl hover:bg-white/[0.02] transition-all duration-300`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-lg">{stat.icon}</span>
            </div>
            <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-medium">{stat.label}</h3>
            <p className={`text-3xl font-black ${stat.color}`}>
              {stat.isString ? stat.value : stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Service List */}
      <div className="glass rounded-2xl p-8 border border-white/5">
        {services.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4 opacity-60">🏷️</div>
            <p className="text-slate-400 font-medium">{t("services.noServices")}</p>
            <p className="text-slate-500 text-sm mt-2">{t("services.noServicesDesc")}</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            {services.map((s: any) => (
              editingId === s.id ? (
                <div key={s.id} className="glass-sm p-5 rounded-xl border border-emerald-500/30">
                  <h4 className="text-sm font-bold text-white mb-4">✏️ Edit Service</h4>
                  <div className="flex flex-col gap-3">
                    <input value={editForm.title || ""} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="input-field text-sm" placeholder="Title" />
                    <textarea value={editForm.description || ""} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="input-field text-sm min-h-[80px] resize-none" placeholder="Description" />
                    <div className="grid grid-cols-2 gap-3">
                      <input type="number" value={editForm.price || ""} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} className="input-field text-sm" placeholder="Price" />
                      <div className="flex gap-1">
                        <button type="button" onClick={() => setEditForm({ ...editForm, category: "NUTRITION", sportId: "" })} className={`flex-1 rounded-lg text-xs font-semibold border ${editForm.category === "NUTRITION" ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-white/5 text-slate-400"}`}>🥗 Nutrition</button>
                        <button type="button" onClick={() => setEditForm({ ...editForm, category: "SPORTS", sportId: "" })} className={`flex-1 rounded-lg text-xs font-semibold border ${editForm.category === "SPORTS" ? "border-amber-500 bg-amber-500/10 text-amber-400" : "border-white/5 text-slate-400"}`}>🏋️ Sports</button>
                      </div>
                    </div>
                    {editForm.category === "SPORTS" && (
                      <div className="flex flex-wrap gap-1">
                        {sports.map((sp: any) => (
                          <button key={sp.id} type="button" onClick={() => setEditForm({ ...editForm, sportId: editForm.sportId === sp.id ? "" : sp.id })}
                            className={`text-[10px] px-2 py-1 rounded-lg border ${editForm.sportId === sp.id ? "border-amber-500 bg-amber-500/20 text-amber-400" : "border-white/5 text-slate-400"}`}
                          >{sp.icon} {sp.name}</button>
                        ))}
                      </div>
                    )}
                    <input value={editForm.imageUrl || ""} onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })} className="input-field text-sm" placeholder="Image URL" />
                    {editForm.imageUrl && (
                      <div className="w-20 h-14 rounded-lg overflow-hidden border border-white/5 relative">
                        <Image src={editForm.imageUrl} alt="" fill className="object-cover" />
                      </div>
                    )}
                    <div className="flex gap-2 mt-1">
                      <button onClick={() => handleEditSave(s.id)} disabled={savingEdit} className="btn-primary !py-1.5 !px-4 text-xs disabled:opacity-50">
                        {savingEdit ? "Saving..." : "Save"}
                      </button>
                      <button onClick={cancelEdit} className="btn-ghost !py-1.5 !px-4 text-xs">Cancel</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div key={s.id} className="group glass-sm p-5 rounded-xl border border-white/[0.03] hover:border-emerald-500/20 hover:bg-white/[0.03] transition-all duration-500">
                  <div className="flex items-start gap-4">
                    {s.imageUrl ? (
                      <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-white/5 relative">
                        <Image src={s.imageUrl} alt="" fill className="object-cover transition-transform duration-500 group-hover:scale-110" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 flex items-center justify-center text-2xl flex-shrink-0 border border-white/5">
                        🏷️
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-white truncate group-hover:text-emerald-300 transition-colors">{s.title}</h3>
                        <span className={`badge text-[10px] flex-shrink-0 ${s.category === "SPORTS" ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                          {s.category === "SPORTS" ? "🏋️" : "🥗"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{s.description}</p>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.03]">
                        <span className="font-bold text-emerald-400">{fDZD(s.price)}</span>
                        <button onClick={() => startEdit(s)} className="text-[10px] text-slate-500 hover:text-emerald-400 transition-colors flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   ORDERS TAB
   ═══════════════════════════════════════════════════ */
function OrdersTab() {
  const { t } = useLocale();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await orderAPI.getExpertOrders();
        setOrders(data);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const paymentBadge = (ps: string) => {
    const colors: Record<string, string> = { PENDING: "badge-orange", HELD: "badge-blue", RELEASED: "badge-emerald", REFUNDED: "badge-red" };
    const labels: Record<string, string> = { PENDING: `⏳ ${t("orders.pending")}`, HELD: `🔒 ${t("dashboard.paymentHeld")}`, RELEASED: `✅ ${t("dashboard.paymentReleased")}`, REFUNDED: `↩️ ${t("dashboard.orderRefunded")}` };
    return <span className={`badge text-[10px] ${colors[ps] || "badge-blue"}`}>{labels[ps] || ps}</span>;
  };

  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const completedCount = orders.filter((o) => o.status === "completed").length;
  const cancelledCount = orders.filter((o) => o.status === "cancelled").length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">{t("orders.title")}</h2>
          <p className="text-slate-400 text-sm mt-1">{orders.length} {t("orders.subtitle")}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-5">
        {[
          { value: pendingCount, label: t("orders.pending"), color: "text-white", border: "border-t-orange-500", icon: "⏳", bg: "bg-orange-500/10" },
          { value: completedCount, label: t("orders.completed"), color: "text-emerald-400", border: "border-t-emerald-500", icon: "✅", bg: "bg-emerald-500/10" },
          { value: cancelledCount, label: t("orders.cancelled"), color: "text-red-400", border: "border-t-red-500", icon: "❌", bg: "bg-red-500/10" },
        ].map((stat) => (
          <div key={stat.label} className={`glass p-6 border-t-2 ${stat.border} rounded-2xl hover:bg-white/[0.02] transition-all duration-300`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center text-lg`}>{stat.icon}</span>
            </div>
            <p className={`text-3xl font-black ${stat.color}`}><AnimatedCounter value={stat.value} /></p>
            <p className="text-xs text-slate-500 mt-1 font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Orders */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-800/30 animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center border border-white/5">
          <div className="text-6xl mb-5 opacity-40">📦</div>
          <h3 className="text-xl font-bold text-white mb-2">{t("orders.noOrders")}</h3>
          <p className="text-slate-400 text-sm">{t("orders.noOrdersDesc")}</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {orders.map((order) => {
            const customerName = order.user?.profile?.fullName || order.user?.email || "Customer";
            const customerPhoto = order.user?.profile?.photoUrl;
            return (
              <div key={order.id} className="group glass-sm p-5 rounded-xl border border-white/[0.03] hover:border-emerald-500/20 hover:bg-white/[0.03] transition-all duration-500">
                <div className="flex items-start gap-4">
                  {customerPhoto ? (
                    <Image src={customerPhoto} alt="" width={48} height={48} className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500/20 flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0 shadow-lg">
                      {customerName[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-white text-sm truncate group-hover:text-emerald-300 transition-colors">{order.service.title}</h3>
                      <span className={`badge text-[10px] flex-shrink-0 ${order.service.category === "SPORTS" ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                        {order.service.category === "SPORTS" ? "🏋️" : "🥗"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {t("orders.byCustomer")} <span className="text-slate-400 font-medium">{customerName}</span>
                    </p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.03]">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-emerald-400">{fDZD(order.service.price)}</span>
                        <span className="text-[10px] text-slate-600">{new Date(order.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {paymentBadge(order.paymentStatus)}
                        <Link
                          href={`/dashboard/expert?chat=${order.user.id}`}
                          className="btn-ghost !py-1.5 !px-3 text-xs rounded-lg hover:bg-emerald-500/10 hover:border-emerald-500/20 border border-white/5 transition-all"
                        >
                          💬 {t("orders.chat")}
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   CHAT TAB
   ═══════════════════════════════════════════════════ */
function ChatTab() {
  const { t } = useLocale();
  const user = getUser();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [selectedPartnerEmail, setSelectedPartnerEmail] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const msgCountRef = useRef(0);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const [autoSelectDone, setAutoSelectDone] = useState(false);
  const [expertOrders, setExpertOrders] = useState<any[]>([]);
  const [currentOrder, setCurrentOrder] = useState<any | null>(null);

  // ─── Video Call State ───────────────────────────────────────────────
  const [callState, setCallState] = useState<"idle" | "calling" | "connected" | "ended">("idle");
  const [incomingCall, setIncomingCall] = useState<{ from: string; callerName: string; callerPhoto: string | null; callLogId: string; offer?: any } | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [callMuted, setCallMuted] = useState(false);
  const [callCameraOn, setCallCameraOn] = useState(true);
  const [callLogId, setCallLogId] = useState<string | null>(null);
  const [missedCalls, setMissedCalls] = useState<Set<string>>(new Set());
  const [partnerOnline, setPartnerOnline] = useState(false);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const durationRef = useRef<NodeJS.Timeout | null>(null);

  const cleanupCall = useCallback(() => {
    if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
    if (localStreamRef.current) { stopLocalStream(localStreamRef.current); localStreamRef.current = null; }
    if (durationRef.current) { clearInterval(durationRef.current); durationRef.current = null; }
    setLocalStream(null); setRemoteStream(null); setCallDuration(0);
    setIncomingCall(null); setCallLogId(null);
  }, []);

  // ─── Socket Setup ───────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    const token = getToken();
    if (!token) return;
    const socket = connectSocket(token);

    socket.on("user:online", ({ userId: id }: { userId: string }) => {
      if (id === selectedPartner) setPartnerOnline(true);
    });
    socket.on("user:offline", ({ userId: id }: { userId: string }) => {
      if (id === selectedPartner) setPartnerOnline(false);
    });

    socket.on("call:incoming", (data: { from: string; callerName: string; callerPhoto: string | null; callLogId: string; offer: any }) => {
      setIncomingCall(data);
    });

    socket.on("call:accepted", async ({ callLogId: id, answer, from }: { callLogId: string; answer: any; from: string }) => {
      setCallLogId(id); setCallState("connected");
      const pc = peerRef.current;
      if (pc && answer) {
        try { await setRemoteDescription(pc, answer); } catch {}
      }
    });

    socket.on("call:rejected", () => { cleanupCall(); setCallState("idle"); });
    socket.on("call:timeout", () => {
      if (selectedPartner) setMissedCalls((prev) => new Set(prev).add(selectedPartner));
      cleanupCall(); setCallState("idle");
    });
    socket.on("call:missed", () => {
      if (selectedPartner) setMissedCalls((prev) => new Set(prev).add(selectedPartner));
      cleanupCall(); setCallState("idle");
    });

    socket.on("call:ice-candidate", async ({ from: _, candidate }: { from: string; candidate: any }) => {
      const pc = peerRef.current;
      if (pc && candidate) {
        try { await addIceCandidate(pc, candidate); } catch {}
      }
    });

    socket.on("call:ended", () => {
      cleanupCall(); setCallState("ended");
      setTimeout(() => setCallState("idle"), 2500);
    });

    return () => {
      socket.off("user:online"); socket.off("user:offline");
      socket.off("call:incoming"); socket.off("call:accepted");
      socket.off("call:rejected"); socket.off("call:timeout");
      socket.off("call:missed"); socket.off("call:ice-candidate");
      socket.off("call:ended");
    };
  }, [selectedPartner]);

  // ─── Video Call Handlers ───────────────────────────────────────────
  const handleStartCall = async () => {
    if (!selectedPartner) return;
    try {
      const stream = await startLocalStream();
      localStreamRef.current = stream;
      setLocalStream(stream);
      setCallState("calling");

      const pc = createPeerConnection(
        (remote) => { setRemoteStream(remote); },
        (candidate) => {
          const socket = getSocket();
          if (socket) socket.emit("call:ice-candidate", { to: selectedPartner, candidate });
        },
      );
      peerRef.current = pc;

      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      const offer = await createOffer(pc);

      const socket = getSocket();
      if (!socket) { cleanupCall(); return; }
      socket.emit("call:offer", { calleeId: selectedPartner, offer });

      durationRef.current = setInterval(() => {
        setCallDuration((d) => d + 1);
      }, 1000);
    } catch {
      cleanupCall(); setCallState("idle");
    }
  };

  const handleAcceptCall = async () => {
    if (!incomingCall) return;
    try {
      const stream = await startLocalStream();
      localStreamRef.current = stream;
      setLocalStream(stream);
      setCallState("connected");
      setCallLogId(incomingCall.callLogId);

      const pc = createPeerConnection(
        (remote) => { setRemoteStream(remote); },
        (candidate) => {
          const socket = getSocket();
          if (socket) socket.emit("call:ice-candidate", { to: incomingCall.from, candidate });
        },
      );
      peerRef.current = pc;

      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      if (incomingCall.offer) {
        await setRemoteDescription(pc, incomingCall.offer);
        const answer = await createAnswer(pc);

        const socket = getSocket();
        if (socket) {
          socket.emit("call:accept", { callLogId: incomingCall.callLogId, calleeId: incomingCall.from, answer });
        }
      }

      setIncomingCall(null);

      durationRef.current = setInterval(() => {
        setCallDuration((d) => d + 1);
      }, 1000);
    } catch {
      cleanupCall(); setCallState("idle");
    }
  };

  const handleRejectCall = () => {
    if (!incomingCall) return;
    const socket = getSocket();
    if (socket) socket.emit("call:reject", { callLogId: incomingCall.callLogId, calleeId: incomingCall.from });
    setIncomingCall(null);
  };

  const handleEndCall = () => {
    const socket = getSocket();
    if (socket && selectedPartner && callState === "connected") {
      socket.emit("call:end", { to: selectedPartner, callLogId, duration: callDuration });
    }
    if (incomingCall) {
      const socket = getSocket();
      if (socket) socket.emit("call:reject", { callLogId: incomingCall.callLogId, calleeId: incomingCall.from });
      setIncomingCall(null);
    }
    cleanupCall();
    setCallState("idle");
  };

  useEffect(() => {
    loadConversations();
    loadExpertOrders();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const loadExpertOrders = async () => {
    try { const data = await orderAPI.getExpertOrders(); setExpertOrders(data); } catch {}
  };

  useEffect(() => {
    if (autoSelectDone || conversations.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const chatId = params.get("chat");
    if (!chatId) { setAutoSelectDone(true); return; }
    const found = conversations.find((c) => c.partnerId === chatId);
    if (found) {
      selectConversation(found.partnerId, found.partnerEmail);
      setAutoSelectDone(true);
      window.history.replaceState({}, "", "/dashboard/expert");
    }
  }, [conversations, autoSelectDone]);

  useEffect(() => {
    if (messages.length > msgCountRef.current) {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }
    msgCountRef.current = messages.length;
  }, [messages]);

  const loadConversations = async () => {
    try { const data = await messageAPI.getConversations(); setConversations(data); } catch {}
    setLoadingConvos(false);
  };

  const selectConversation = async (partnerId: string, partnerEmail: string) => {
    setSelectedPartner(partnerId); setSelectedPartnerEmail(partnerEmail); setLoadingMsgs(true);
    setCurrentOrder(null); setPartnerOnline(false);
    if (pollRef.current) clearInterval(pollRef.current);

    const order = expertOrders.find((o: any) => o.user?.id === partnerId);
    setCurrentOrder(order || null);

    try { const data = await messageAPI.getMessages(partnerId); setMessages(data); } catch {}
    setLoadingMsgs(false);
    pollRef.current = setInterval(async () => {
      try { const data = await messageAPI.getMessages(partnerId); setMessages(data); } catch {}
    }, 3000);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedPartner) return;
    setSending(true);
    try {
      await messageAPI.sendMessage(selectedPartner, newMessage.trim());
      setNewMessage("");
      const data = await messageAPI.getMessages(selectedPartner); setMessages(data);
      loadConversations();
    } catch {}
    setSending(false);
  };

  return (
    <>
      {/* ─── Video Call Overlays ─── */}
      {localStream && callState === "connected" && (
        <VideoCallOverlay
          localStream={localStream}
          remoteStream={remoteStream}
          partnerName={incomingCall ? incomingCall.callerName : selectedPartnerEmail}
          partnerPhoto={incomingCall ? incomingCall.callerPhoto : null}
          duration={callDuration}
          muted={callMuted}
          cameraOn={callCameraOn}
          onToggleMute={() => {
            setCallMuted((m) => !m);
            if (localStreamRef.current)
              localStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = callMuted; });
          }}
          onToggleCamera={() => {
            setCallCameraOn((c) => !c);
            if (localStreamRef.current)
              localStreamRef.current.getVideoTracks().forEach((t) => { t.enabled = callCameraOn; });
          }}
          onEndCall={handleEndCall}
        />
      )}

      {callState === "calling" && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-gray-700 mx-auto mb-4 flex items-center justify-center text-3xl animate-pulse">📹</div>
            <p className="text-white text-lg font-semibold">{t("call.calling")}</p>
            <p className="text-gray-400 text-sm mt-1">{selectedPartnerEmail}</p>
            <button onClick={handleEndCall} className="mt-6 btn-primary !bg-red-600 !px-8"><span>{t("call.endCall")}</span></button>
          </div>
        </div>
      )}

      {callState === "ended" && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center pointer-events-none">
          <div className="text-center animate-fade-in">
            <div className="text-4xl mb-3">📞</div>
            <p className="text-white text-lg">{t("call.callEnded")}</p>
            {callDuration > 0 && (
              <p className="text-gray-400 text-sm mt-1">{Math.floor(callDuration / 60)}:{String(callDuration % 60).padStart(2, "0")}</p>
            )}
          </div>
        </div>
      )}

      {incomingCall && (
        <IncomingCallModal
          callerName={incomingCall.callerName}
          callerPhoto={incomingCall.callerPhoto}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}

      <div className="glass rounded-2xl border border-white/5 overflow-hidden" style={{ height: "650px" }}>
      <div className="flex h-full">
        {/* Conversations Sidebar */}
        <div className="w-72 lg:w-80 border-r border-white/5 flex flex-col flex-shrink-0">
          <div className="p-5 border-b border-white/5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center text-xs">💬</span>
              {t("chat.conversations")}
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {loadingConvos ? (
              <div className="p-4 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800/40 animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 rounded bg-slate-800/40 animate-pulse w-3/4" />
                      <div className="h-2 rounded bg-slate-800/40 animate-pulse w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-4xl mb-3 opacity-50">📭</div>
                <p className="text-slate-500 text-sm">{t("chat.noConversations")}</p>
                <p className="text-slate-500 text-xs mt-1">{t("chat.clientInterestDesc")}</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button key={conv.partnerId} onClick={() => selectConversation(conv.partnerId, conv.partnerEmail)}
                  className={`w-full p-4 text-left transition-all duration-200 border-b border-white/[0.02] flex items-center gap-3 ${
                    selectedPartner === conv.partnerId
                      ? "bg-emerald-500/10 border-l-[3px] border-l-emerald-500"
                      : "hover:bg-white/[0.02] border-l-[3px] border-l-transparent"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-lg shadow-emerald-500/10">
                    {conv.partnerEmail[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white truncate">{conv.partnerEmail}</span>
                      <div className="flex items-center gap-1.5">
                        {missedCalls.has(conv.partnerId) && (
                          <span className="text-[10px] text-red-400 font-semibold" title={t("call.missedCallLabel")}>🕐</span>
                        )}
                        {conv.unreadCount > 0 && (
                          <span className="w-5 h-5 rounded-full bg-emerald-500 text-[10px] font-bold text-black flex items-center justify-center flex-shrink-0 shadow-sm shadow-emerald-500/30">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{conv.lastMessage}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedPartner ? (
            <div className="flex-1 flex items-center justify-center bg-white/[0.01]">
              <div className="text-center p-8">
                <div className="text-6xl mb-4 opacity-20">💬</div>
                <h3 className="text-lg font-bold text-white mb-2">{t("chat.yourMessages")}</h3>
                <p className="text-slate-500 text-sm">{t("chat.selectConversation")}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3 bg-white/[0.01]">
                <button onClick={() => setSelectedPartner(null)} className="lg:hidden text-slate-400 hover:text-white mr-1 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-lg">
                  {selectedPartnerEmail[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white truncate">{selectedPartnerEmail}</p>
                    {missedCalls.has(selectedPartner) && (
                      <span className="text-[10px] text-red-400 font-semibold">{t("call.missedCallLabel")} 🕐</span>
                    )}
                  </div>
                  <p className={`text-[10px] ${partnerOnline ? "text-emerald-400" : "text-slate-500"} flex items-center gap-1`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${partnerOnline ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
                    {partnerOnline ? t("common.online") : t("common.offline")}
                  </p>
                </div>
                <button
                  onClick={handleStartCall}
                  disabled={callState !== "idle"}
                  className="btn-ghost !p-2.5 !rounded-full flex-shrink-0 disabled:opacity-30"
                  title={t("call.videoCall")}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                </button>
              </div>

              {/* Order Banner */}
              {currentOrder && currentOrder.paymentStatus && (
                <div className={`px-5 py-3 border-b ${
                  currentOrder.paymentStatus === "RELEASED" ? "border-emerald-500/20 bg-emerald-500/5" :
                  currentOrder.paymentStatus === "HELD" ? "border-blue-500/20 bg-blue-500/5" :
                  currentOrder.paymentStatus === "PENDING" ? "border-amber-500/20 bg-amber-500/5" : "border-white/5"
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {currentOrder.paymentStatus === "HELD" && <>🔒 {t("dashboard.paymentHeld")}</>}
                      {currentOrder.paymentStatus === "RELEASED" && <>✅ {t("dashboard.paymentReleased")}</>}
                      {currentOrder.paymentStatus === "PENDING" && <>⏳ {t("dashboard.awaitingPayment")}</>}
                      {currentOrder.paymentStatus === "REFUNDED" && <>↩️ {t("dashboard.orderRefunded")}</>}
                    </span>
                  </div>
                  {currentOrder.service?.title && (
                    <p className="text-xs text-slate-500 mt-1">
                      {currentOrder.service.title} — {fDZD(currentOrder.amount || currentOrder.service?.price || 0)}
                    </p>
                  )}
                </div>
              )}

              {/* Messages */}
              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-5 space-y-3 bg-white/[0.005]">
                {loadingMsgs ? (
                  <div className="flex items-center justify-center h-full">
                    <svg className="animate-spin w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="text-4xl mb-3 opacity-40">👋</div>
                      <p className="text-slate-500 text-sm">{t("chat.startChat")}</p>
                      <p className="text-slate-500 text-xs mt-1">{t("chat.startChatDesc")}</p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMe = msg.senderId === user?.id;
                    const showAvatar = idx === 0 || messages[idx - 1]?.senderId !== msg.senderId;
                    return (
                      <div key={msg.id} className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"} ${showAvatar ? "mt-4" : "mt-0.5"}`}>
                        {!isMe && showAvatar && (
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 shadow-sm">
                            {msg.sender.email[0].toUpperCase()}
                          </div>
                        )}
                        {!isMe && !showAvatar && <div className="w-7" />}
                        <div className={`max-w-[75%] px-4 py-2.5 text-sm shadow-lg ${
                          isMe
                            ? "bg-gradient-to-r from-emerald-600 to-cyan-600 text-white rounded-2xl rounded-br-md"
                            : "glass-sm text-slate-200 rounded-2xl rounded-bl-md border border-white/5"
                        }`}>
                          {msg.content && <p className="leading-relaxed">{msg.content}</p>}
                          {msg.imageUrl && (
                            <Image src={msg.imageUrl} alt="Shared image" width={0} height={0} sizes="100vw"
                              className={`rounded-xl max-h-64 object-cover w-auto h-auto cursor-pointer transition-transform duration-200 hover:scale-[1.02] ${msg.content ? "mt-2" : ""}`}
                              onClick={() => window.open(msg.imageUrl!, "_blank")}
                            />
                          )}
                          <p className={`text-[10px] mt-1.5 ${isMe ? "text-emerald-200/60" : "text-slate-500"}`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}

              </div>

              {/* Input */}
              <div className="p-4 border-t border-white/5 bg-white/[0.01]">
                <div className="flex gap-2 items-center">
                  <button type="button" onClick={() => document.getElementById("expert-chat-image")?.click()}
                    className="btn-ghost !p-2.5 !rounded-xl flex-shrink-0 hover:bg-emerald-500/10 hover:border-emerald-500/20 border border-white/5 transition-all"
                    title={t("chat.sendPhoto")}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <input id="expert-chat-image" type="file" accept="image/*" className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !selectedPartner) return;
                      try {
                        const res = await uploadAPI.uploadFile(file);
                        await messageAPI.sendMessage(selectedPartner, "", res.url);
                        const data = await messageAPI.getMessages(selectedPartner);
                        setMessages(data);
                        loadConversations();
                      } catch {}
                      e.target.value = "";
                    }}
                  />
                  <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
                    className="input-field flex-1 !rounded-xl" placeholder={t("chat.typeMessage")}
                  />
                  <button onClick={handleSend} disabled={sending || !newMessage.trim()}
                    className="btn-primary !py-2.5 !px-5 text-sm rounded-xl disabled:opacity-50 shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:scale-[1.02] active:scale-95"
                  >
                    <span className="flex items-center gap-1.5">
                      {sending ? (
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                      )}
                      {t("chat.send")}
                    </span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════
   WALLET TAB
   ═══════════════════════════════════════════════════ */
function WalletTab() {
  const { t } = useLocale();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositing, setDepositing] = useState(false);
  const [msg, setMsg] = useState("");

  const loadWallet = async () => {
    try { const b = await paymentAPI.getBalance(); setBalance(b.balance); } catch {}
    try { const t = await paymentAPI.getTransactions(); setTransactions(t); } catch {}
  };

  useEffect(() => { loadWallet(); }, []);

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) return;
    setDepositing(true); setMsg("");
    try {
      const res = await paymentAPI.deposit(amount);
      setBalance(res.balance);
      setDepositAmount("");
      setMsg(`${fDZD(amount)} deposited successfully!`);
      loadWallet();
    } catch (err: unknown) { setMsg((err as Error).message); }
    setDepositing(false);
  };

  const transIcon: Record<string, string> = {
    DEPOSIT: "💰", HOLD: "🔒", RELEASE: "✅", REFUND: "↩️",
  };

  const totalEarnings = transactions.filter((t) => t.type === "RELEASE").reduce((s: number, t: any) => s + t.amount, 0);

  return (
    <div className="space-y-8">
      {/* Balance Hero */}
      <div className="relative overflow-hidden rounded-3xl glass border border-white/5 p-8 md:p-10">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-cyan-500/8 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{t("dashboard.currentBalance")}</h2>
            <span className="text-xs text-slate-500 bg-white/[0.04] px-3 py-1 rounded-full">{transactions.length} {t("dashboard.transactions")}</span>
          </div>
          <p className="text-5xl md:text-6xl font-black gradient-text tracking-tight">
            {fDZD(balance)}
          </p>
          <p className="text-slate-500 text-sm mt-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
            Manage your earnings and deposits
          </p>
        </div>
      </div>

      {msg && (
        <div className={`p-4 glass-sm text-sm rounded-xl flex items-center gap-3 ${
          msg.includes("successfully") ? "border border-emerald-500/20 text-emerald-400" : "border border-red-500/20 text-red-400"
        }`}>
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            {msg.includes("successfully")
              ? <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              : <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            }
          </svg>
          {msg}
        </div>
      )}

      {/* Deposit */}
      <div className="glass rounded-2xl p-8 border border-white/5">
        <h3 className="text-sm font-bold text-white mb-5 flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-sm">💳</span>
          {t("dashboard.deposit")}
        </h3>
        <div className="flex gap-3 items-start">
          <div className="flex-1 max-w-xs">
            <input type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)}
              className="input-field" placeholder={t("dashboard.depositAmount")} min="1" step="0.01"
              onKeyDown={(e) => { if (e.key === "Enter") handleDeposit(); }}
            />
          </div>
          <button onClick={handleDeposit} disabled={depositing || !depositAmount}
            className="btn-primary !py-2.5 !px-6 text-sm rounded-xl disabled:opacity-50 shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:scale-[1.02] active:scale-95"
          >
            <span className="flex items-center gap-2">
              {depositing ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              )}
              {depositing ? t("common.loading") : t("dashboard.deposit")}
            </span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-5">
        {[
          { value: fDZD(balance), label: t("dashboard.currentBalance"), id: "balance", color: "text-emerald-400", border: "border-t-emerald-500", icon: "💰" },
          { value: fDZD(totalEarnings), label: t("dashboard.totalEarnings"), id: "earnings", color: "text-blue-400", border: "border-t-blue-500", icon: "📈" },
          { value: transactions.length, label: t("dashboard.transactions"), id: "transactions", color: "text-purple-400", border: "border-t-purple-500", icon: "🔄" },
        ].map((stat) => (
          <div key={stat.id} className={`glass p-6 border-t-2 ${stat.border} rounded-2xl hover:bg-white/[0.02] transition-all duration-300`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                stat.id === "balance" ? "bg-emerald-500/10" :
                stat.id === "earnings" ? "bg-blue-500/10" : "bg-purple-500/10"
              }`}>{stat.icon}</span>
            </div>
            <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-slate-500 mt-1 font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Transactions */}
      {transactions.length > 0 && (
        <div className="glass rounded-2xl p-8 border border-white/5">
          <h3 className="text-sm font-bold text-white mb-5 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-slate-500/15 flex items-center justify-center text-sm">📋</span>
            {t("dashboard.transactionHistory")}
          </h3>
          <div className="divide-y divide-slate-800/50">
            {transactions.slice(0, 20).map((tx: any) => {
              const isCredit = tx.type === "DEPOSIT" || tx.type === "RELEASE" || tx.type === "REFUND";
              return (
                <div key={tx.id} className="py-4 flex items-center justify-between hover:bg-white/[0.02] px-4 -mx-4 rounded-lg transition-all duration-200">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                      tx.type === "DEPOSIT" ? "bg-emerald-500/10" :
                      tx.type === "RELEASE" ? "bg-blue-500/10" :
                      tx.type === "REFUND" ? "bg-amber-500/10" : "bg-red-500/10"
                    }`}>
                      {transIcon[tx.type] || "💳"}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{tx.description || tx.type}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {new Date(tx.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        {" at "}
                        {new Date(tx.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${isCredit ? "text-emerald-400" : "text-red-400"}`}>
                    {isCredit ? "+" : "-"}{fDZD(tx.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
