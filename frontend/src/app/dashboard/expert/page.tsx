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
  fetchTurnCredentials, waitForDeviceRelease, cleanupAudioSink,
  ensureAudioSink, addLocalTracks, attemptIceRestart, resetIceRestartAttempts,
} from "@/lib/webrtc";
import type { CreatePcCallbacks } from "@/lib/webrtc";
import { useCallSound } from "@/lib/useCallSound";
import { normalizeUrl } from "@/lib/url";
import { useInCall } from "@/contexts/CallContext";
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

// Polished Cyber-Dark Input Classes
const inputClasses = "w-full bg-[#07080f] border border-white/10 text-white rounded-xl px-5 py-4 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600 shadow-inner font-medium";

export default function ExpertDashboard() {
  const router = useRouter();
  const { t } = useLocale();

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: "profile", label: t("profile.title"), icon: "👤" },
    { key: "services", label: t("services.title"), icon: "⚡" },
    { key: "orders", label: t("orders.title"), icon: "📦" },
    { key: "chat", label: t("nav.messages"), icon: "💬" },
    { key: "wallet", label: t("dashboard.wallet"), icon: "💳" },
  ];
  const [user, setUser] = useState<{ email: string; role: string; id?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("profile");

  useEffect(() => {
    if (isLoggedIn()) setUser(getUser());
    else router.push("/login");
    const params = new URLSearchParams(window.location.search);
    if (params.get("chat")) setActiveTab("chat");
  }, []);

  return (
    <div className="min-h-screen bg-transparent text-slate-100 relative z-0 overflow-x-hidden selection:bg-emerald-500/30">
      {/* Decorative cyber backdrop circles */}
      <div className="absolute top-[10%] left-[5%] w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[5%] w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="flex flex-col lg:flex-row max-w-[1600px] mx-auto min-h-screen relative gap-6 px-4 lg:px-8 py-8 lg:py-12 pt-24 lg:pt-28 min-w-0">
        
        {/* FLOATING CYBER DOCK (Balanced & Aligned to avoid collisions) */}
        <nav className="fixed lg:sticky bottom-4 lg:top-28 left-4 right-4 lg:left-0 lg:h-[calc(100vh-140px)] lg:w-24 bg-[#0a0b16]/95 backdrop-blur-3xl border border-white/10 rounded-2xl lg:rounded-[2rem] z-40 flex lg:flex-col items-center justify-center lg:justify-start py-3 px-5 lg:py-8 lg:px-0 shadow-[0_15px_40px_rgba(0,0,0,0.8)] overflow-x-auto lg:overflow-visible gap-1 lg:gap-6 shrink-0">
          
          <div className="hidden lg:flex w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 items-center justify-center text-lg font-black text-black shadow-[0_0_15px_rgba(16,185,129,0.3)] mb-4">
            {user?.email?.[0].toUpperCase() || "X"}
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
                {isActive && (
                  <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full" />
                )}
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
        <div className="flex-1 lg:pl-4 pb-32 lg:pb-0 min-w-0">
          
          {/* HEADER DASHBOARD CARD */}
          <div className="relative mb-8 overflow-hidden rounded-2xl bg-[#0a0b16]/90 backdrop-blur-2xl border border-white/10 p-6 lg:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.6)] animate-fade-up group">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            <div className="relative flex items-center justify-between flex-wrap gap-6 z-10">
              <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,1)]" />
                    Verified Expert System
                  </div>
                  <h1 className="text-3xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tighter uppercase">
                    {t("dashboard.expertTitle")}
                  </h1>
                  <p className="text-slate-400 font-bold mt-2 flex items-center gap-3 text-xs lg:text-sm font-mono">
                    <span className="text-emerald-500">_ID:</span> {user?.email}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="animate-fade-up-d2 relative z-10">
            {activeTab === "profile" && <ProfileTab />}
            {activeTab === "services" && <ServicesTab />}
            {activeTab === "orders" && <OrdersTab />}
            {activeTab === "chat" && <ChatTab />}
            {activeTab === "wallet" && <WalletTab />}
          </div>
        </div>
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
        className="px-6 py-4 rounded-xl bg-white/5 text-white font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all border border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.5)] disabled:opacity-50"
      >
        <span className="flex items-center gap-2">
          {uploading ? (
            <svg className="animate-spin w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          ) : (
            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          )}
          {uploading ? "UPLOADING..." : label}
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
      <div className="grid md:grid-cols-3 gap-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-80 rounded-[2.5rem] bg-white/5 animate-pulse border border-white/5" />
        ))}
      </div>
    );
  }

  // ─── VIEW MODE ───
  if (!editMode) {
    return (
      <div className="space-y-6">
        {msg && (
          <div className="p-4 bg-emerald-500/10 text-xs font-black uppercase tracking-widest rounded-xl border border-emerald-500/30 text-emerald-400 flex items-center gap-3 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {msg}
          </div>
        )}

        {/* BENTO GRID LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Hero Card (Spans 2 columns) */}
          <div className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-[#0a0b16]/90 backdrop-blur-2xl border border-white/10 p-6 lg:p-10 shadow-[0_12px_40px_rgba(0,0,0,0.6)] group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row gap-6 items-start relative z-10">
              <div className="relative shrink-0">
                <div className="w-28 h-28 lg:w-36 lg:h-36 rounded-xl overflow-hidden border border-white/15 shadow-[0_0_20px_rgba(0,0,0,0.5)] bg-[#050505] relative group-hover:scale-102 transition-transform duration-500">
                  {photoUrl ? (
                    <Image src={normalizeUrl(photoUrl) || ""} alt="Profile" fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-4xl font-black text-black">
                      {fullName?.[0]?.toUpperCase() || "E"}
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-4 border-[#0a0b16] shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse" />
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h2 className="text-2xl lg:text-3xl font-black text-white tracking-tighter uppercase">
                    {fullName || "Anonymous Expert"}
                  </h2>
                  <button onClick={() => setEditMode(true)}
                    className="flex items-center gap-1.5 px-5 py-2 bg-white/5 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-500 hover:text-black border border-white/10 hover:border-emerald-400 transition-all duration-300 shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                  >
                    ⚙️ Edit
                  </button>
                </div>
                
                <div className="flex items-center gap-2.5 mt-3 flex-wrap">
                  <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 px-3.5 py-1.5 rounded-xl border border-emerald-500/20 shadow-inner">
                    {specialization || "NO SPECIALIZATION"}
                  </span>
                  {yearsExperience && (
                    <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-xl shadow-inner">
                      EXP: {yearsExperience} YRS
                    </span>
                  )}
                </div>

                {bio && (
                  <p className="mt-5 text-slate-400 leading-relaxed font-medium text-xs max-w-xl">
                    {bio}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Stats Column */}
          <div className="flex flex-col gap-4">
            {[
              { value: achievements.length, label: t("profile.achievements"), color: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/5", glow: "shadow-emerald-500/5" },
              { value: certifications.length, label: t("profile.certifications"), color: "text-cyan-400", border: "border-cyan-500/20", bg: "bg-cyan-500/5", glow: "shadow-cyan-500/5" },
              { value: portfolioPhotos.length, label: t("profile.photos"), color: "text-purple-400", border: "border-purple-500/20", bg: "bg-purple-500/5", glow: "shadow-purple-500/5" },
            ].map((stat) => (
              <div key={stat.label} className={`flex-1 ${stat.bg} border border-white/5 hover:${stat.border} p-5 flex flex-col justify-center items-center rounded-2xl backdrop-blur-md shadow-lg hover:${stat.glow} transition-all duration-300 group`}>
                <p className={`text-4xl font-black ${stat.color} drop-shadow-md group-hover:scale-105 transition-transform duration-300`}><AnimatedCounter value={stat.value} /></p>
                <p className="text-[9px] text-slate-500 mt-2 font-black uppercase tracking-widest">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Achievements Bento */}
          {achievements.length > 0 && (
            <div className="bg-[#0a0b16]/90 backdrop-blur-2xl rounded-2xl p-6 lg:p-8 border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2.5">
                <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">🏆</span>
                {t("profile.achievements")}
              </h3>
              <div className="flex flex-wrap gap-2.5">
                {achievements.map((a, i) => (
                  <span key={i} className="bg-white/5 border border-white/10 text-white font-bold text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl shadow-inner hover:border-emerald-500/30 hover:text-emerald-400 transition-colors">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Certifications Bento */}
          {certifications.length > 0 && (
            <div className="bg-[#0a0b16]/90 backdrop-blur-2xl rounded-2xl p-6 lg:p-8 border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2.5">
                <span className="p-2 rounded-lg bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">📜</span>
                {t("profile.certifications")}
              </h3>
              <div className="space-y-2.5">
                {certifications.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10 shadow-inner group hover:border-cyan-500/20 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-sm shadow-sm border border-cyan-500/20">✅</div>
                    <span className="text-slate-200 font-bold text-xs tracking-wide">{c}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Portfolio Bento (Spans full width if present) */}
          {portfolioPhotos.length > 0 && (
            <div className="lg:col-span-full bg-[#0a0b16]/90 backdrop-blur-2xl rounded-2xl p-6 lg:p-8 border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2.5">
                <span className="p-2 rounded-lg bg-purple-500/10 text-purple-500 border border-purple-500/20">📸</span>
                {t("profile.portfolio")}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {portfolioPhotos.map((photo, i) => (
                  <div key={i} className="group relative aspect-square rounded-xl overflow-hidden border border-white/10 shadow-inner">
                    <Image src={photo} alt={`Portfolio ${i + 1}`} fill className="object-cover opacity-80 group-hover:opacity-100 transition-all duration-300" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── EDIT MODE ───
  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4 bg-[#0a0b16]/90 backdrop-blur-2xl p-6 rounded-2xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
        <div>
          <h2 className="text-xl font-black text-white tracking-tighter uppercase">My Profile</h2>
          <p className="text-emerald-500 font-bold text-[10px] uppercase tracking-widest mt-0.5">Edit your profile</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setEditMode(false)} className="px-5 py-2.5 bg-white/5 text-white text-xs font-black uppercase tracking-widest rounded-lg hover:bg-white/10 transition-colors border border-white/10">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2.5 bg-emerald-500 text-black text-xs font-black uppercase tracking-widest rounded-lg shadow-md hover:bg-emerald-400 transition-all disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="bg-[#0a0b16]/90 backdrop-blur-2xl rounded-2xl p-6 lg:p-10 border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
        <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2.5">
          <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">👤</span>
          Basic Info
        </h3>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[9px] font-black text-slate-500 mb-2 uppercase tracking-widest">Full Name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClasses} placeholder="John Doe" />
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-500 mb-2 uppercase tracking-widest">Specialization</label>
            <input value={specialization} onChange={(e) => setSpecialization(e.target.value)} className={inputClasses} placeholder="Strength & Conditioning" />
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-500 mb-2 uppercase tracking-widest">Comms (Phone)</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClasses} placeholder="+213..." />
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-500 mb-2 uppercase tracking-widest">Experience (Years)</label>
            <input type="number" value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} className={inputClasses} placeholder="5" />
          </div>
        </div>

        <div className="mt-8">
          <label className="block text-[9px] font-black text-slate-500 mb-2 uppercase tracking-widest">Avatar Image</label>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
            {photoUrl ? (
              <Image src={normalizeUrl(photoUrl) || ""} alt="Preview" width={80} height={80} className="w-20 h-20 rounded-xl object-cover border border-emerald-500/20" />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-black/50 border border-white/10 flex items-center justify-center text-2xl shadow-inner">📸</div>
            )}
            <div className="flex-1 w-full flex flex-col sm:flex-row gap-3">
              <input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} className={inputClasses} placeholder="Paste image URL..." />
              <UploadButton onUpload={(url) => setPhotoUrl(url)} label="Upload File" />
            </div>
          </div>
        </div>

        <div className="mt-8">
          <label className="block text-[9px] font-black text-slate-500 mb-2 uppercase tracking-widest">Biography</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} className={`${inputClasses} min-h-[120px] resize-none`} placeholder="Describe your expertise..." />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-[#0a0b16]/90 backdrop-blur-2xl rounded-2xl p-6 border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
          <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">🏆</span>
            Achievements
          </h3>
          <div className="flex gap-2.5 mb-4">
            <input value={newAchievement} onChange={(e) => setNewAchievement(e.target.value)}
              className={inputClasses} placeholder="Enter achievement..."
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(newAchievement, setNewAchievement, achievements, setAchievements); }}}
            />
            <button onClick={() => addItem(newAchievement, setNewAchievement, achievements, setAchievements)}
              className="px-5 bg-white/5 hover:bg-white/10 text-white font-black uppercase text-xs tracking-widest rounded-xl transition-colors border border-white/10"
            >
              Add
            </button>
          </div>
          <div className="flex flex-col gap-2.5">
            {achievements.map((a, i) => (
              <div key={i} className="bg-white/5 border border-white/10 text-white font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-between shadow-inner">
                <span className="truncate pr-4">{a}</span>
                <button onClick={() => removeItem(i, achievements, setAchievements)} className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500 hover:bg-rose-500/20 transition-colors shrink-0">✕</button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0a0b16]/90 backdrop-blur-2xl rounded-2xl p-6 border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
          <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">📜</span>
            Certifications
          </h3>
          <div className="flex gap-2.5 mb-4">
            <input value={newCertification} onChange={(e) => setNewCertification(e.target.value)}
              className={inputClasses} placeholder="Enter certification..."
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(newCertification, setNewCertification, certifications, setCertifications); }}}
            />
            <button onClick={() => addItem(newCertification, setNewCertification, certifications, setCertifications)}
              className="px-5 bg-white/5 hover:bg-white/10 text-white font-black uppercase text-xs tracking-widest rounded-xl transition-colors border border-white/10"
            >
              Add
            </button>
          </div>
          <div className="flex flex-col gap-2.5">
            {certifications.map((c, i) => (
              <div key={i} className="bg-white/5 border border-white/10 text-white font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-between shadow-inner">
                <span className="truncate pr-4 flex items-center gap-2"><span className="text-cyan-400">✓</span> {c}</span>
                <button onClick={() => removeItem(i, certifications, setCertifications)} className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500 hover:bg-rose-500/20 transition-colors shrink-0">✕</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[#0a0b16]/90 backdrop-blur-2xl rounded-2xl p-6 border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
        <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2.5">
          <span className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">📸</span>
          Portfolio Evidence
        </h3>
        <div className="flex flex-col sm:flex-row gap-3 mb-6 bg-white/5 p-4 rounded-2xl border border-white/10">
          <input value={newPhoto} onChange={(e) => setNewPhoto(e.target.value)}
            className={inputClasses} placeholder="Paste image URL..."
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(newPhoto, setNewPhoto, portfolioPhotos, setPortfolioPhotos); }}}
          />
          <UploadButton onUpload={(url) => { setPortfolioPhotos([...portfolioPhotos, url]); }} label="Upload Photo" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {portfolioPhotos.map((photo, i) => (
            <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-white/10 shadow-inner">
              <Image src={photo} alt={`Portfolio ${i + 1}`} fill className="object-cover" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <button onClick={() => removeItem(i, portfolioPhotos, setPortfolioPhotos)} className="bg-rose-500 text-white font-black text-[9px] uppercase tracking-widest px-4 py-2 rounded-lg hover:bg-rose-600 transition-colors shadow-lg">Remove</button>
              </div>
            </div>
          ))}
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

  useEffect(() => { loadServices(); sportCategoryAPI.getAll().then(setSports).catch(() => {}); }, []);

  const loadServices = async () => {
    try { const all = await serviceAPI.getAll(); setServices(all); } catch {}
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
    <div className="space-y-6 animate-in fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4 bg-[#0a0b16]/90 backdrop-blur-2xl p-6 rounded-2xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tighter uppercase">{t("services.title")}</h2>
          <p className="text-emerald-500 font-bold text-[10px] uppercase tracking-widest mt-0.5">[{services.length}] Active Services</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className={`px-6 py-3 rounded-lg font-black text-xs uppercase tracking-widest transition-all duration-300 border ${showForm ? "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20" : "bg-emerald-500 text-black border-emerald-400 hover:bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]"}`}
        >
          {showForm ? "Cancel" : "New Service"}
        </button>
      </div>

      {msg && (
        <div className={`p-4 font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-3 border shadow-md ${
          msgType === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
        }`}>
          <span className="text-lg">{msgType === "success" ? "✅" : "⚠️"}</span> {msg}
        </div>
      )}

      {showForm && (
        <div className="bg-[#0a0b16]/90 backdrop-blur-3xl rounded-2xl p-6 lg:p-10 border border-emerald-500/20 shadow-[0_12px_40px_rgba(16,185,129,0.05)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
          <h3 className="text-xs font-black text-white mb-6 flex items-center gap-2.5 uppercase tracking-widest relative z-10">
            <span className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-xl border border-emerald-500/20 text-emerald-400">✨</span>
            Service Details
          </h3>
          <form onSubmit={handleCreate} className="flex flex-col gap-6 relative z-10">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-[9px] font-black text-emerald-500 mb-2 uppercase tracking-widest">Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClasses} placeholder={t("services.serviceTitlePlaceholder")} required />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[9px] font-black text-emerald-500 mb-2 uppercase tracking-widest">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputClasses} min-h-[120px] resize-none`} placeholder={t("services.descriptionPlaceholder")} required />
              </div>
              <div>
                <label className="block text-[9px] font-black text-emerald-500 mb-2 uppercase tracking-widest">Price (DZD)</label>
                <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className={inputClasses} placeholder="1500" required />
              </div>
              <div>
                <label className="block text-[9px] font-black text-emerald-500 mb-2 uppercase tracking-widest">Category</label>
                <div className="grid grid-cols-2 gap-3 h-[58px]">
                  <button type="button" onClick={() => setCategory("NUTRITION")}
                    className={`rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${category === "NUTRITION" ? "border-emerald-500 bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]" : "border-white/10 bg-[#07080f] text-slate-500 hover:bg-white/5"}`}
                  >
                    🥗 {t("marketplace.nutrition")}
                  </button>
                  <button type="button" onClick={() => setCategory("SPORTS")}
                    className={`rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${category === "SPORTS" ? "border-amber-500 bg-amber-500/20 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]" : "border-white/10 bg-[#07080f] text-slate-500 hover:bg-white/5"}`}
                  >
                    🏋️ {t("marketplace.sports")}
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[9px] font-black text-emerald-500 mb-2 uppercase tracking-widest">Cover Image</label>
              <div className="flex flex-col sm:flex-row gap-4 bg-white/5 p-6 rounded-2xl border border-white/10 items-center">
                {imageUrl ? (
                  <div className="w-24 h-16 rounded-lg overflow-hidden border border-emerald-500/20 shadow-md relative shrink-0">
                    <Image src={imageUrl} alt="Preview" fill className="object-cover" />
                  </div>
                ) : (
                  <div className="w-24 h-16 rounded-lg bg-black/50 border border-white/10 flex items-center justify-center text-xl shadow-inner shrink-0">🖼️</div>
                )}
                <div className="flex-1 w-full flex flex-col sm:flex-row gap-3">
                  <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className={inputClasses} placeholder={t("services.pasteImageUrl")} />
                  <UploadButton onUpload={(url) => setImageUrl(url)} label="Browse" />
                </div>
              </div>
            </div>
            <div className="border-t border-white/10 pt-6">
              <button type="submit" disabled={loading}
                className="w-full bg-emerald-500 text-black font-black text-base tracking-widest py-4 rounded-xl shadow-md hover:bg-emerald-400 active:scale-98 transition-all disabled:opacity-50 uppercase"
              >
                {loading ? "Creating..." : "Publish"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Services List - Holographic Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {services.length === 0 ? (
          <div className="col-span-full bg-[#0a0b16]/90 backdrop-blur-2xl p-12 rounded-2xl border border-white/10 text-center">
            <div className="text-5xl mb-4 opacity-20">📭</div>
            <p className="text-white font-black text-xl uppercase tracking-widest">{t("services.noServices")}</p>
            <p className="text-slate-500 font-bold mt-2 uppercase tracking-widest text-[10px]">{t("services.noServicesDesc")}</p>
          </div>
        ) : (
          services.map((s: any) => (
            <div key={s.id} className="group relative bg-[#0a0b16]/90 backdrop-blur-xl rounded-2xl p-1 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl flex flex-col">
              <div className="relative bg-[#07080f] rounded-xl h-full flex flex-col border border-white/5 z-10 overflow-hidden">
                <div className="h-44 relative overflow-hidden bg-black/50">
                  {s.imageUrl ? (
                    <Image src={s.imageUrl} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out opacity-80 group-hover:opacity-100" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-10">⚡</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#07080f] via-transparent to-transparent" />
                  <span className={`absolute top-4 left-4 px-3 py-1.5 text-[8px] font-black uppercase tracking-widest rounded-lg backdrop-blur-md border shadow-md ${s.category === "SPORTS" ? "bg-amber-500/20 text-amber-400 border-amber-500/20" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/20"}`}>
                    {s.category === "SPORTS" ? "🏋️ Sports" : "🥗 Nutrition"}
                  </span>
                  <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between">
                    <h3 className="font-black text-lg text-white truncate uppercase tracking-tight">{s.title}</h3>
                  </div>
                </div>
                
                <div className="p-5 flex-1 flex flex-col">
                  <p className="text-xs text-slate-400 line-clamp-3 font-medium leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5 flex-1">{s.description}</p>
                  
                  <div className="mt-5 flex items-center justify-between pt-5 border-t border-white/10">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Exchange Rate</span>
                      <p className={`font-black text-base ${s.category === "SPORTS" ? "text-amber-400" : "text-emerald-400"} drop-shadow-md`}>{fDZD(s.price)}</p>
                    </div>
                    <Link href="/my-services" className="px-4 py-2 bg-white/5 text-white font-black text-[9px] uppercase tracking-widest rounded-lg hover:bg-white/25 transition-colors border border-white/10">
                      Edit ↗
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))
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
      try { const data = await orderAPI.getExpertOrders(); setOrders(data); } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const paymentBadge = (ps: string) => {
    const configs: Record<string, { bg: string, text: string, border: string, icon: string, label: string }> = {
      PENDING: { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-400", icon: "⏳", label: t("orders.pending") },
      HELD: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400", icon: "🔒", label: t("dashboard.paymentHeld") },
      RELEASED: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", icon: "✅", label: t("dashboard.paymentReleased") },
      REFUNDED: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", icon: "↩️", label: t("dashboard.orderRefunded") },
    };
    const c = configs[ps] || { bg: "bg-white/5", border: "border-white/10", text: "text-slate-400", icon: "📦", label: ps };
    return <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border ${c.bg} ${c.text} ${c.border} shadow-sm`}>{c.icon} {c.label}</span>;
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-[#0a0b16]/90 backdrop-blur-2xl p-6 rounded-2xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.5)] flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Messages & Orders</h2>
          <p className="text-emerald-500 font-bold text-[10px] uppercase tracking-widest mt-0.5">[{orders.length}] Active Services</p>
        </div>
      </div>

      <div className="bg-[#0a0b16]/90 backdrop-blur-2xl rounded-2xl p-6 lg:p-8 border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.5)] relative overflow-hidden">
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />
        {loading ? (
          <div className="grid md:grid-cols-2 gap-6 relative z-10">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-44 rounded-xl bg-white/5 animate-pulse border border-white/5" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 relative z-10">
            <div className="text-6xl mb-4 opacity-20">📦</div>
            <h3 className="text-xl font-black text-white mb-2 uppercase tracking-widest">{t("orders.noOrders")}</h3>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">{t("orders.noOrdersDesc")}</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6 relative z-10">
            {orders.map((order) => {
              const customerName = order.user?.profile?.fullName || order.user?.email || "UNKNOWN ENTITY";
              const customerPhoto = order.user?.profile?.photoUrl;
              return (
                <div key={order.id} className="bg-black/40 p-6 rounded-xl border border-white/10 hover:border-emerald-500/20 transition-all duration-300 group">
                  <div className="flex items-start gap-4">
                    {customerPhoto ? (
                      <Image src={customerPhoto} alt="" width={56} height={56} className="w-14 h-14 rounded-xl object-cover border border-white/15 shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 flex items-center justify-center text-xl font-black text-indigo-400 shrink-0">
                        {customerName[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-white text-base truncate mb-1.5 uppercase tracking-tight group-hover:text-emerald-400 transition-colors">{order.service.title}</h3>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">
                        By <span className="text-white bg-white/10 px-2 py-0.5 rounded ml-1 font-mono">{customerName}</span>
                      </p>
                      <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
                        <span className="text-lg font-black text-emerald-400">{fDZD(order.service.price)}</span>
                        {paymentBadge(order.paymentStatus)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest font-mono">Date: {new Date(order.createdAt).toLocaleDateString()}</span>
                    <Link
                      href={`/dashboard/expert?chat=${order.user.id}`}
                      className="px-4 py-2.5 bg-white/5 text-white font-black text-[9px] uppercase tracking-widest rounded-lg hover:bg-emerald-500 hover:text-black transition-colors border border-white/10 flex items-center gap-1.5"
                    >
                      <span>💬</span> Chat
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
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
  const [callError, setCallError] = useState<string | null>(null);
  const [socketError, setSocketError] = useState<string | null>(null);
  const [iceConnState, setIceConnState] = useState<string>("new");
  const { playRingtone, stopRingtone } = useCallSound();
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const durationRef = useRef<NodeJS.Timeout | null>(null);
  const isCallActiveRef = useRef(false);
  const callStateRef = useRef(callState);
  useEffect(() => { callStateRef.current = callState; }, [callState]);
  const { setInCall } = useInCall();
  useEffect(() => { setInCall(callState === "connected"); }, [callState, setInCall]);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  const flushPendingCandidates = useCallback(async () => {
    const pc = peerRef.current;
    if (!pc || !pc.remoteDescription || pendingCandidatesRef.current.length === 0) return;
    const batch = pendingCandidatesRef.current;
    pendingCandidatesRef.current = [];
    for (const c of batch) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
    }
  }, []);

  const cleanupCall = useCallback(() => {
    if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
    if (localStreamRef.current) { stopLocalStream(localStreamRef.current); localStreamRef.current = null; }
    if (durationRef.current) { clearInterval(durationRef.current); durationRef.current = null; }
    cleanupAudioSink();
    isCallActiveRef.current = false;
    setLocalStream(null); setRemoteStream(null); setCallDuration(0);
    setIncomingCall(null); setCallLogId(null); setCallError(null); setIceConnState("new");
  }, []);

  // ─── Socket Setup ───────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    const token = getToken();
    if (!token) return;
    setSocketError(null);
    const socket = connectSocket(token, (msg) => setSocketError(msg));

    socket.on("user:online", ({ userId: id }: { userId: string }) => {
      if (id === selectedPartner) setPartnerOnline(true);
    });
    socket.on("user:offline", ({ userId: id }: { userId: string }) => {
      if (id === selectedPartner) setPartnerOnline(false);
    });

    socket.on("call:incoming", async (data: { from: string; callerName: string; callerPhoto: string | null; callLogId: string; offer: any }) => {
      const pc = peerRef.current;
      if (pc && callStateRef.current === "connected") {
        if (data.offer) {
          try {
            await setRemoteDescription(pc, data.offer);
            await flushPendingCandidates();
            const answer = await createAnswer(pc);
            const socket = getSocket();
            if (socket) socket.emit("call:accept", { callLogId: data.callLogId, calleeId: data.from, answer });
          } catch (err) {
            console.error("ICE restart offer handling failed:", err);
          }
        }
        return;
      }
      setIncomingCall(data);
      playRingtone();
    });

    socket.on("call:accepted", async ({ callLogId: id, answer, from }: { callLogId: string; answer: any; from: string }) => {
      stopRingtone();
      setCallLogId(id); setCallState("connected");
      const pc = peerRef.current;
      if (pc && answer) {
        try { await setRemoteDescription(pc, answer); } catch {}
        await flushPendingCandidates();
      }
    });

    socket.on("call:rejected", () => { stopRingtone(); cleanupCall(); setCallState("idle"); });
    socket.on("call:timeout", () => {
      stopRingtone();
      if (selectedPartner) setMissedCalls((prev) => new Set(prev).add(selectedPartner));
      cleanupCall(); setCallState("idle");
    });
    socket.on("call:missed", () => {
      stopRingtone();
      if (selectedPartner) setMissedCalls((prev) => new Set(prev).add(selectedPartner));
      cleanupCall(); setCallState("idle");
    });

    socket.on("call:ice-candidate", async ({ from: _, candidate }: { from: string; candidate: any }) => {
      const pc = peerRef.current;
      if (!pc || !candidate) return;
      if (pc.remoteDescription) {
        try { await addIceCandidate(pc, candidate); } catch {}
      } else {
        pendingCandidatesRef.current.push(candidate);
      }
    });

    socket.on("call:ended", () => {
      stopRingtone();
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
    if (!selectedPartner || isCallActiveRef.current) return;
    isCallActiveRef.current = true;
    setCallError(null);
    resetIceRestartAttempts();
    ensureAudioSink();
    try {
      await fetchTurnCredentials();
      await waitForDeviceRelease();
      const stream = await startLocalStream();
      localStreamRef.current = stream;
      setLocalStream(stream);
      setCallState("calling");

      const cb: CreatePcCallbacks = {
        onRemoteStream: (remote) => { setRemoteStream(remote); },
        onIceCandidate: (candidate) => {
          const socket = getSocket();
          if (socket) socket.emit("call:ice-candidate", { to: selectedPartner, candidate });
        },
        onIceFailed: () => {
          setCallError("Connection lost. Check your network and try a different connection.");
          cleanupCall(); setCallState("idle");
        },
        onIceStateChange: (state) => setIceConnState(state),
        onDisconnected: async () => {
          const pc = peerRef.current;
          if (!pc) return;
          const newOffer = await attemptIceRestart(pc);
          if (newOffer) {
            const socket = getSocket();
            if (socket) socket.emit("call:offer", { calleeId: selectedPartner, offer: newOffer });
          } else {
            setCallError("Connection lost. Check your network and try a different connection.");
            cleanupCall(); setCallState("idle");
          }
        },
      };
      const pc = createPeerConnection(cb);
      peerRef.current = pc;

      addLocalTracks(pc, stream);
      const offer = await createOffer(pc);

      const socket = getSocket();
      if (!socket) { cleanupCall(); return; }
      socket.emit("call:offer", { calleeId: selectedPartner, offer });

      durationRef.current = setInterval(() => {
        setCallDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      setCallError(err instanceof DOMException && err.name === "NotAllowedError"
        ? "Camera/microphone permission denied. Allow access in browser settings."
        : err instanceof DOMException && err.name === "NotFoundError"
        ? "No camera or microphone found. Connect a device and try again."
        : "Failed to start call. Try again.");
      cleanupCall(); setCallState("idle");
    }
  };

  const handleAcceptCall = async () => {
    if (!incomingCall || isCallActiveRef.current) return;
    isCallActiveRef.current = true;
    setCallError(null);
    resetIceRestartAttempts();
    stopRingtone();
    ensureAudioSink();
    try {
      await fetchTurnCredentials();
      await waitForDeviceRelease();
      const stream = await startLocalStream();
      localStreamRef.current = stream;
      setLocalStream(stream);
      setCallState("connected");
      setCallLogId(incomingCall.callLogId);

      const cb: CreatePcCallbacks = {
        onRemoteStream: (remote) => { setRemoteStream(remote); },
        onIceCandidate: (candidate) => {
          const socket = getSocket();
          if (socket) socket.emit("call:ice-candidate", { to: incomingCall.from, candidate });
        },
        onIceFailed: () => {
          setCallError("Connection lost. Check your network and try a different connection.");
          cleanupCall(); setCallState("idle");
        },
        onIceStateChange: (state) => setIceConnState(state),
        onDisconnected: async () => {
          const pc = peerRef.current;
          if (!pc) return;
          const newOffer = await attemptIceRestart(pc);
          if (newOffer) {
            const socket = getSocket();
            if (socket) socket.emit("call:offer", { calleeId: incomingCall.from, offer: newOffer });
          } else {
            setCallError("Connection lost. Check your network and try a different connection.");
            cleanupCall(); setCallState("idle");
          }
        },
      };
      const pc = createPeerConnection(cb);
      peerRef.current = pc;

      addLocalTracks(pc, stream);

      if (incomingCall.offer) {
        await setRemoteDescription(pc, incomingCall.offer);
        await flushPendingCandidates();
        const answer = await createAnswer(pc);
        const socket = getSocket();
        if (socket) {
          socket.emit("call:accept", { callLogId: incomingCall.callLogId, calleeId: incomingCall.from, answer });
        }
      }

      setIncomingCall(null);
      durationRef.current = setInterval(() => { setCallDuration((d) => d + 1); }, 1000);
    } catch (err) {
      setCallError(err instanceof DOMException && err.name === "NotAllowedError"
        ? "Camera/microphone permission denied. Allow access in browser settings."
        : err instanceof DOMException && err.name === "NotFoundError"
        ? "No camera or microphone found. Connect a device and try again."
        : "Failed to answer call. Try again.");
      cleanupCall(); setCallState("idle");
    }
  };

  const handleRejectCall = () => {
    if (!incomingCall) return;
    stopRingtone();
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
      {socketError && (
        <div className="fixed top-0 left-0 right-0 z-[200] bg-rose-600 text-white px-4 py-3 text-sm text-center font-black uppercase tracking-widest shadow-md">
          {socketError}
        </div>
      )}
      {callError && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[110] bg-rose-500/25 backdrop-blur-md border border-rose-500/50 text-rose-400 px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest animate-fade-in shadow-[0_0_30px_rgba(239,68,68,0.5)] max-w-md text-center">
          {callError}
        </div>
      )}
      {localStream && callState === "connected" && (
        <VideoCallOverlay
          localStream={localStream}
          remoteStream={remoteStream}
          partnerName={incomingCall ? incomingCall.callerName : selectedPartnerEmail}
          partnerPhoto={incomingCall ? normalizeUrl(incomingCall.callerPhoto) : null}
          duration={callDuration}
          muted={callMuted}
          cameraOn={callCameraOn}
          iceState={iceConnState}
          onToggleMute={() => {
            setCallMuted((prev) => {
              const next = !prev;
              if (localStreamRef.current)
                localStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = !next; });
              return next;
            });
          }}
          onToggleCamera={() => {
            setCallCameraOn((prev) => {
              const next = !prev;
              if (localStreamRef.current)
                localStreamRef.current.getVideoTracks().forEach((t) => { t.enabled = next; });
              return next;
            });
          }}
          onEndCall={handleEndCall}
        />
      )}

      {callState === "calling" && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px] animate-pulse" />
          <div className="text-center relative z-10">
            <div className="w-24 h-24 rounded-2xl bg-black/50 border border-emerald-500/30 mx-auto mb-6 flex items-center justify-center text-4xl animate-pulse shadow-[0_0_50px_rgba(16,185,129,0.3)]">📹</div>
            <p className="text-emerald-400 text-2xl font-black tracking-tighter uppercase mb-2">Connecting...</p>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">{selectedPartnerEmail}</p>
            <button onClick={handleEndCall} className="mt-8 px-8 py-3 bg-rose-500/20 text-rose-500 border border-rose-500/50 hover:bg-rose-500 hover:text-black font-black uppercase tracking-widest rounded-xl transition-all">
              End Call
            </button>
          </div>
        </div>
      )}

      {callState === "ended" && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center pointer-events-none">
          <div className="text-center bg-black/50 p-10 rounded-2xl shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200">
            <div className="text-5xl mb-4 opacity-50">📞</div>
            <p className="text-white text-xl font-black uppercase tracking-widest">Call Ended</p>
            {callDuration > 0 && (
              <p className="text-emerald-500 font-black text-base mt-3 bg-emerald-500/10 inline-block px-4 py-1.5 rounded-lg border border-emerald-500/20">
                {Math.floor(callDuration / 60)}:{String(callDuration % 60).padStart(2, "0")}
              </p>
            )}
          </div>
        </div>
      )}

      {incomingCall && (
        <IncomingCallModal
          callerName={incomingCall.callerName}
          callerPhoto={normalizeUrl(incomingCall.callerPhoto)}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}

      <div className="bg-[#0a0b16]/90 backdrop-blur-2xl rounded-2xl border border-white/10 overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.5)] animate-in fade-in min-h-[400px] lg:h-[700px] relative">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
        <div className="flex h-full relative z-10">
          
          {/* Sidebar */}
          <div className={`${selectedPartner ? "hidden lg:flex" : "flex"} w-full lg:w-80 border-r border-white/10 bg-black/30 flex-col flex-shrink-0`}>
            <div className="p-6 border-b border-white/10">
              <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">💬</span>
                Conversations
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loadingConvos ? (
                <div className="p-5 space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3">
                      <div className="w-10 h-10 rounded-lg bg-white/5 animate-pulse flex-shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-2.5 rounded bg-white/5 animate-pulse w-3/4" />
                        <div className="h-2 rounded bg-white/5 animate-pulse w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center mt-8">
                  <div className="text-4xl mb-4 opacity-20">📭</div>
                  <p className="text-white font-black uppercase tracking-widest text-xs">No conversations</p>
                  <p className="text-slate-600 text-[10px] mt-2 font-bold uppercase tracking-widest">No messages yet</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button key={conv.partnerId} onClick={() => selectConversation(conv.partnerId, conv.partnerEmail)}
                    className={`w-full p-5 text-left transition-all duration-300 border-b border-white/5 flex items-center gap-4 relative group ${
                      selectedPartner === conv.partnerId
                        ? "bg-emerald-500/10"
                        : "hover:bg-white/5"
                    }`}
                  >
                    {selectedPartner === conv.partnerId && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,1)]" />
                    )}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0 transition-all ${selectedPartner === conv.partnerId ? "bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.5)]" : "bg-white/5 text-slate-400 border border-white/10"}`}>
                      {conv.partnerEmail[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[11px] font-black uppercase tracking-widest truncate ${selectedPartner === conv.partnerId ? "text-emerald-400" : "text-white"}`}>{conv.partnerEmail}</span>
                        <div className="flex items-center gap-1.5">
                          {missedCalls.has(conv.partnerId) && (
                            <span className="text-[8px] text-rose-500 font-black uppercase">MISSED</span>
                          )}
                          {conv.unreadCount > 0 && (
                            <span className="w-5 h-5 rounded bg-emerald-500 text-[9px] font-black text-black flex items-center justify-center flex-shrink-0">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-[9px] font-bold text-slate-500 truncate uppercase tracking-wider">{conv.lastMessage}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Main Chat Area */}
          <div className={`${!selectedPartner ? "hidden lg:flex" : "flex"} flex-1 flex-col min-w-0 bg-black/10 relative`}>
            {!selectedPartner ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center p-8 bg-[#0a0b16]/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl max-w-sm">
                  <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-xl mx-auto flex items-center justify-center text-3xl mb-4 shadow-inner">💬</div>
                  <h3 className="text-base font-black text-white mb-2 uppercase tracking-widest">Messages</h3>
                  <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">Select a conversation to start chatting.</p>
                </div>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="px-6 py-4 border-b border-white/10 flex items-center gap-4 bg-[#0a0b16]/60 backdrop-blur-md z-10">
                  <button onClick={() => setSelectedPartner(null)} className="lg:hidden text-slate-400 hover:text-white mr-1 transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs font-black text-white flex-shrink-0 shadow-inner">
                    {selectedPartnerEmail[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-xs font-black text-white uppercase tracking-widest truncate">{selectedPartnerEmail}</p>
                      {missedCalls.has(selectedPartner) && (
                        <span className="text-[8px] bg-rose-500/15 text-rose-500 border border-rose-500/20 px-1.5 py-0.5 rounded font-black uppercase tracking-widest">MISSED 🕐</span>
                      )}
                    </div>
                    <p className={`text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 ${partnerOnline ? "text-emerald-500" : "text-slate-500"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${partnerOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-600"}`} />
                      {partnerOnline ? "Online" : "Offline"}
                    </p>
                  </div>
                  <button
                    onClick={handleStartCall}
                    disabled={callState !== "idle"}
                    className="w-10 h-10 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 flex items-center justify-center transition-all disabled:opacity-30 border border-emerald-500/20 shadow-md group"
                    title={t("call.videoCall")}
                  >
                    <svg className="w-5 h-5 group-hover:scale-105 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="23 7 16 12 23 17 23 7" />
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                    </svg>
                  </button>
                </div>

                {/* Order Banner */}
                {currentOrder && currentOrder.paymentStatus && (
                  <div className={`px-6 py-3 border-b flex items-center justify-between bg-[#0a0b16]/60 backdrop-blur-sm ${
                    currentOrder.paymentStatus === "RELEASED" ? "border-emerald-500/20 bg-emerald-500/5" :
                    currentOrder.paymentStatus === "HELD" ? "border-blue-500/20 bg-blue-500/5" :
                    currentOrder.paymentStatus === "PENDING" ? "border-amber-500/20 bg-amber-500/5" : "border-white/10"
                  }`}>
                    <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest">
                      {currentOrder.paymentStatus === "HELD" && <span className="text-blue-400 bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/20">🔒 {t("dashboard.paymentHeld")}</span>}
                      {currentOrder.paymentStatus === "RELEASED" && <span className="text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">✅ {t("dashboard.paymentReleased")}</span>}
                      {currentOrder.paymentStatus === "PENDING" && <span className="text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20">⏳ {t("dashboard.awaitingPayment")}</span>}
                      {currentOrder.paymentStatus === "REFUNDED" && <span className="text-rose-400 bg-rose-500/10 px-2 py-1 rounded-md border border-rose-500/20">↩️ {t("dashboard.orderRefunded")}</span>}
                    </div>
                    {currentOrder.service?.title && (
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        {currentOrder.service.title} <span className="mx-1.5 text-white/10">|</span> <span className="text-white">{fDZD(currentOrder.amount || currentOrder.service?.price || 0)}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Messages Body */}
                <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar relative">
                  {loadingMsgs ? (
                    <div className="flex items-center justify-center h-full">
                      <svg className="animate-spin w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full relative z-10">
                      <div className="text-center p-6 bg-black/40 border border-white/10 rounded-2xl shadow-md backdrop-blur-md">
                        <div className="text-4xl mb-4 opacity-25">👋</div>
                        <p className="text-white font-black text-xs uppercase tracking-widest mb-1">Start chatting</p>
                        <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">{t("chat.startChatDesc")}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative z-10 space-y-4">
                      {messages.map((msg, idx) => {
                        const isMe = msg.senderId === user?.id;
                        const showAvatar = idx === 0 || messages[idx - 1]?.senderId !== msg.senderId;
                        return (
                          <div key={msg.id} className={`flex items-end gap-3 ${isMe ? "justify-end" : "justify-start"} ${showAvatar ? "mt-6" : "mt-1.5"}`}>
                            {!isMe && showAvatar && (
                              <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[9px] font-black text-white flex-shrink-0 shadow-inner">
                                {msg.sender.email[0].toUpperCase()}
                              </div>
                            )}
                            {!isMe && !showAvatar && <div className="w-8" />}
                            <div className={`max-w-[75%] px-4 py-3 text-xs ${
                              isMe
                                ? "bg-emerald-500 text-black rounded-2xl rounded-br-none shadow-[0_0_15px_rgba(16,185,129,0.25)] font-medium"
                                : "bg-white/5 backdrop-blur-md text-white rounded-2xl rounded-bl-none border border-white/10 font-medium"
                            }`}>
                              {msg.content && <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>}
                              {msg.imageUrl && (
                                <div className={`relative rounded-lg overflow-hidden border ${isMe ? "border-black/10" : "border-white/10"} ${msg.content ? "mt-3" : ""}`}>
                                  <Image src={msg.imageUrl} alt="Shared image" width={0} height={0} sizes="100vw"
                                    className="max-h-[220px] object-cover w-auto h-auto cursor-pointer hover:scale-102 transition-transform duration-300"
                                    onClick={() => window.open(msg.imageUrl!, "_blank")}
                                  />
                                </div>
                              )}
                              <p className={`text-[8px] font-black uppercase tracking-widest mt-1.5 text-right ${isMe ? "text-emerald-900/60" : "text-slate-500"}`}>
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-white/10 bg-black/60 backdrop-blur-xl relative z-20">
                  <div className="flex gap-3 items-center bg-black/50 border border-white/10 p-2 rounded-xl shadow-inner focus-within:ring-1 focus-within:ring-emerald-500/50 transition-all">
                    <button type="button" onClick={() => document.getElementById("expert-chat-image")?.click()}
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 bg-white/5 hover:bg-emerald-500/10 hover:text-emerald-400 border border-transparent transition-all shrink-0"
                      title={t("chat.sendPhoto")}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
                      className="flex-1 bg-transparent border-none outline-none text-white text-xs px-1" placeholder="Type a message..."
                    />
                    <button onClick={handleSend} disabled={sending || !newMessage.trim()}
                      className="px-5 py-2.5 bg-emerald-500 text-black text-[10px] font-black uppercase tracking-widest rounded-lg disabled:opacity-50 hover:bg-emerald-400 transition-all shrink-0 flex items-center gap-2"
                    >
                      {sending ? (
                        <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                      )}
                      <span className="hidden sm:inline">SEND</span>
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
      setMsg(`Deposit of ${fDZD(amount)} successful.`);
      loadWallet();
    } catch (err: unknown) { setMsg((err as Error).message); }
    setDepositing(false);
  };

  const transIcon: Record<string, string> = {
    DEPOSIT: "💰", HOLD: "🔒", RELEASE: "✅", REFUND: "↩️",
  };

  const totalEarnings = transactions.filter((t) => t.type === "RELEASE").reduce((s: number, t: any) => s + t.amount, 0);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Holographic Balance Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-[#090a14] p-8 lg:p-12 border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.6)] group">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-purple-500/10 opacity-60 pointer-events-none" />
        <div className="absolute -top-32 -right-32 w-[350px] h-[350px] bg-emerald-500/5 rounded-full blur-[90px] pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-[300px] h-[300px] bg-cyan-500/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border border-white/10 px-3 py-1.5 rounded-lg bg-black/40 backdrop-blur-md">Balance</h2>
            </div>
            <p className="text-5xl lg:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 tracking-tighter">
              {fDZD(balance)}
            </p>
            <p className="text-emerald-500 font-black text-[10px] uppercase tracking-widest mt-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
              Active
            </p>
          </div>
          
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-xl shadow-2xl flex flex-col items-center justify-center min-w-[180px]">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Total Earnings</span>
            <span className="text-2xl font-black text-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.4)]">{fDZD(totalEarnings)}</span>
          </div>
        </div>
      </div>

      {msg && (
        <div className={`p-4 text-xs font-black uppercase tracking-widest rounded-xl flex items-center gap-3 border shadow-md ${
          msg.includes("successful") ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
        }`}>
          <span className="text-lg">{msg.includes("successful") ? "✅" : "⚠️"}</span> {msg}
        </div>
      )}

      {/* Control Panel (Deposit) */}
      <div className="bg-[#0a0b16]/90 backdrop-blur-2xl rounded-2xl p-6 lg:p-8 border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
        <h3 className="text-xs font-black text-white mb-4 flex items-center gap-2.5 uppercase tracking-widest">
          <span className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-base border border-white/10">💳</span>
          Deposit
        </h3>
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
            Transaction History
          </h3>
          <div className="divide-y divide-white/5">
            {transactions.slice(0, 20).map((tx: any) => {
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
  );
}