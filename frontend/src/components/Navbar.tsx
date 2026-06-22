"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getUser, logout, isLoggedIn } from "@/lib/auth";
import { profileAPI } from "@/lib/api";
import { useLocale } from "@/i18n/LocaleContext";

export default function Navbar() {
  const [user, setUser] = useState<{ email: string; role: string } | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { t, locale, setLocale } = useLocale();

  useEffect(() => {
    if (isLoggedIn()) {
      const u = getUser();
      setUser(u);
      const cached = localStorage.getItem("profile_photo");
      if (cached) setProfilePhoto(cached);
      profileAPI.getMyProfile().then((p) => {
        if (p?.photoUrl) {
          setProfilePhoto(p.photoUrl);
          localStorage.setItem("profile_photo", p.photoUrl);
        }
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const isExpert = user?.role === "EXPERT";
  const isUser = user?.role === "USER";

  const navLinks = isExpert
    ? [
        { href: "/", label: t("nav.home") },
        { href: "/my-services", label: t("nav.services") },
        { href: "/games", label: t("nav.games") },
        { href: "/dashboard/expert", label: t("nav.dashboard") },
      ]
    : isUser
      ? [
          { href: "/marketplace", label: t("nav.marketplace") },
          { href: "/marketplace/sports", label: t("nav.sports") },
          { href: "/marketplace/nutrition", label: t("nav.nutrition") },
          { href: "/messages", label: t("nav.messages") },
          { href: "/ai", label: t("nav.aiAssistant") },
          { href: "/games", label: t("nav.games") },
        ]
      : [
          { href: "/marketplace", label: t("nav.marketplace") },
          { href: "/marketplace/sports", label: t("nav.sports") },
          { href: "/marketplace/nutrition", label: t("nav.nutrition") },
          { href: "/ai", label: t("nav.aiAssistant") },
          { href: "/games", label: t("nav.games") },
        ];

  return (
    <nav className={`fixed top-0 w-full z-50 glass-nav px-6 lg:px-10 py-4 flex justify-between items-center transition-all duration-300 ${scrolled ? "shadow-[0_8px_32px_rgba(0,0,0,0.5)] border-b border-white/10" : ""}`}>
      <Link href="/" className="flex items-center gap-2 group">
        <Image
          src="/logo.png"
          alt="AthletiX"
          width={36}
          height={36}
          className="rounded-xl transition-all duration-300 group-hover:scale-110"
        />
        <span className="text-xl font-bold gradient-text tracking-tight relative overflow-hidden">
          AthletiX
        </span>
      </Link>

      <div className="hidden md:flex items-center gap-8">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`relative text-sm font-medium transition-colors hover:text-white ${pathname === link.href ? "text-white" : "text-slate-400"}`}
          >
            {link.label}
            {pathname === link.href && (
              <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            )}
          </Link>
        ))}
      </div>

      <div className="hidden md:flex items-center gap-4">
        <button
          onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
          className="text-xs text-slate-400 hover:text-emerald-400 transition-colors px-3 py-1.5 rounded-lg border border-white/5 hover:border-emerald-500/30 font-medium"
        >
          {t("nav.language")}
        </button>

        {user ? (
          <>
            {!isExpert && (
              <Link
                href={`/dashboard/${user.role.toLowerCase()}`}
                className="text-sm text-slate-300 hover:text-white transition-colors"
              >
                {t("nav.dashboard")}
              </Link>
            )}
            <div className="flex items-center gap-2 glass-sm px-3 py-1 border border-white/10 shadow-sm">
              {profilePhoto ? (
                <Image src={profilePhoto} alt="" width={24} height={24} className="w-6 h-6 rounded-full object-cover border border-emerald-500/30" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-[10px] font-black text-black">
                  {user.email[0].toUpperCase()}
                </div>
              )}
              <div className="flex flex-col items-start leading-none">
                <span className="text-[11px] font-semibold text-slate-200 max-w-[100px] truncate">{user.email.split('@')[0]}</span>
                <span className="text-[8px] font-extrabold text-emerald-400 tracking-wider uppercase mt-0.5">{user.role}</span>
              </div>
            </div>
            <button onClick={logout} className="text-xs text-slate-500 hover:text-red-400 transition-colors cursor-pointer">
              {t("nav.logout")}
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="text-sm text-slate-300 hover:text-white transition-colors px-4 py-2">
              {t("nav.logIn")}
            </Link>
            <Link href="/register" className="btn-primary !py-2 !px-5 text-sm">
              <span>{t("nav.getStarted")}</span>
            </Link>
          </>
        )}
      </div>

      {/* Mobile hamburger */}
      <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden flex flex-col gap-1.5 p-2">
        <span className={`w-5 h-0.5 bg-white transition-all ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
        <span className={`w-5 h-0.5 bg-white transition-all ${menuOpen ? "opacity-0" : ""}`} />
        <span className={`w-5 h-0.5 bg-white transition-all ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
      </button>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="absolute top-full left-0 right-0 glass-nav p-6 flex flex-col gap-4 md:hidden border-t border-white/5 animate-slide-in">
          <button
            onClick={() => { setLocale(locale === "ar" ? "en" : "ar"); setMenuOpen(false); }}
            className="text-slate-300 hover:text-emerald-400 text-left font-medium"
          >
            {t("nav.language")}
          </button>
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="text-slate-300 hover:text-white">
              {link.label}
            </Link>
          ))}
          {user ? (
            <>
              {!isExpert && (
                <Link href={`/dashboard/${user.role.toLowerCase()}`} onClick={() => setMenuOpen(false)} className="text-slate-300 hover:text-white">{t("nav.dashboard")}</Link>
              )}
              <button onClick={logout} className="text-red-400 text-left">{t("nav.logout")}</button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setMenuOpen(false)} className="text-slate-300">{t("nav.logIn")}</Link>
              <Link href="/register" onClick={() => setMenuOpen(false)} className="btn-primary text-center text-sm"><span>{t("nav.getStarted")}</span></Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
