
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
  const [fullName, setFullName] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { t, locale, setLocale } = useLocale();

  useEffect(() => {
    if (isLoggedIn()) {
      const u = getUser();
      setUser(u);
      const cachedPhoto = localStorage.getItem("profile_photo");
      const cachedName = localStorage.getItem("profile_name");
      if (cachedPhoto) setProfilePhoto(cachedPhoto);
      if (cachedName) setFullName(cachedName);
      profileAPI.getMyProfile().then((p) => {
        if (p?.photoUrl) {
          setProfilePhoto(p.photoUrl);
          localStorage.setItem("profile_photo", p.photoUrl);
        }
        if (p?.fullName) {
          setFullName(p.fullName);
          localStorage.setItem("profile_name", p.fullName);
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
    <nav
      className={`fixed z-50 transition-all duration-300 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-7xl flex justify-between items-center rounded-full glass-nav px-5 sm:px-8 
        ${
          scrolled
            ? "top-2 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.5)] border border-white/10"
            : "top-4 py-4 shadow-lg border border-white/5"
        }
      `}
    >
      {/* Left: Logo */}
      <Link href="/" className="flex items-center gap-2 group ml-1 sm:ml-0">
        <Image
          src="/logo.png"
          alt="AthletiX"
          width={36}
          height={36}
          className="rounded-full transition-all duration-300 group-hover:scale-110 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
        />
        <span className="text-xl font-bold gradient-text tracking-tight relative overflow-hidden hidden sm:block">
          AthletiX
        </span>
      </Link>

      {/* Center: Desktop Links */}
      <div className="hidden lg:flex items-center gap-8">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`relative text-sm font-medium transition-colors hover:text-white ${
              pathname === link.href ? "text-white" : "text-slate-400"
            }`}
          >
            {link.label}
            {pathname === link.href && (
              <span className="absolute -bottom-1.5 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            )}
          </Link>
        ))}
      </div>

      {/* Right: Actions */}
      <div className="hidden md:flex items-center gap-3">
        <button
          onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
          className="text-xs text-slate-400 hover:text-emerald-400 transition-colors px-4 py-2 rounded-full border border-white/5 hover:border-emerald-500/30 font-medium"
        >
          {t("nav.language")}
        </button>

        {user ? (
          <>
            {!isExpert && (
              <Link
                href={`/dashboard/${user.role.toLowerCase()}`}
                className="text-sm text-slate-300 hover:text-white transition-colors px-2"
              >
                {t("nav.dashboard")}
              </Link>
            )}
            <div className="flex items-center gap-2 glass-sm px-3 py-1.5 rounded-full border border-white/5 shadow-sm">
              {profilePhoto ? (
                <Image
                  src={profilePhoto}
                  alt=""
                  width={28}
                  height={28}
                  className="w-7 h-7 rounded-full object-cover border border-emerald-500/30"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-[10px] font-black text-black">
                  {user.email[0].toUpperCase()}
                </div>
              )}
              <div className="flex flex-col items-start leading-none pr-1">
                <span className="text-[11px] font-semibold text-slate-200 max-w-[90px] truncate">
                  {fullName || user.email.split("@")[0]}
                </span>
                <span className="text-[8px] font-extrabold text-emerald-400 tracking-wider uppercase mt-0.5">
                  {user.role}
                </span>
              </div>
            </div>
            <button
              onClick={logout}
              className="text-xs text-slate-500 hover:text-red-400 transition-colors cursor-pointer pl-1"
            >
              {t("nav.logout")}
            </button>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="text-sm text-slate-300 hover:text-white transition-colors px-4 py-2 rounded-full hover:bg-white/5"
            >
              {t("nav.logIn")}
            </Link>
            <Link href="/register" className="btn-primary !py-2 !px-5 text-sm !rounded-full">
              <span>{t("nav.getStarted")}</span>
            </Link>
          </>
        )}
      </div>

      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="md:hidden flex flex-col gap-1.5 p-2 mr-1 sm:mr-0"
        aria-label="Toggle menu"
      >
        <span className={`w-5 h-0.5 bg-white transition-all ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
        <span className={`w-5 h-0.5 bg-white transition-all ${menuOpen ? "opacity-0" : ""}`} />
        <span className={`w-5 h-0.5 bg-white transition-all ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
      </button>

      {/* Mobile Floating Menu Dropdown */}
      {menuOpen && (
        <div className="absolute top-[calc(100%+1rem)] left-0 w-full glass-nav rounded-3xl p-6 flex flex-col gap-4 md:hidden border border-white/10 shadow-2xl animate-slide-in">
          <button
            onClick={() => {
              setLocale(locale === "ar" ? "en" : "ar");
              setMenuOpen(false);
            }}
            className="text-slate-300 hover:text-emerald-400 text-left font-medium pb-2 border-b border-white/5"
          >
            {t("nav.language")}
          </button>
          
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="text-slate-300 hover:text-white text-lg font-medium py-1"
            >
              {link.label}
            </Link>
          ))}
          
          <div className="mt-2 pt-4 border-t border-white/5 flex flex-col gap-4">
            {user ? (
              <>
                {!isExpert && (
                  <Link
                    href={`/dashboard/${user.role.toLowerCase()}`}
                    onClick={() => setMenuOpen(false)}
                    className="text-slate-300 hover:text-white"
                  >
                    {t("nav.dashboard")}
                  </Link>
                )}
                <button onClick={logout} className="text-red-400 text-left font-medium">
                  {t("nav.logout")}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="text-slate-300 hover:text-white"
                >
                  {t("nav.logIn")}
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMenuOpen(false)}
                  className="btn-primary text-center text-sm !rounded-full !py-3 mt-2"
                >
                  <span>{t("nav.getStarted")}</span>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
