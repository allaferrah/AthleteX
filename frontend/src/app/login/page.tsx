"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authAPI } from "@/lib/api";
import { saveAuth } from "@/lib/auth";
import { useLocale } from "@/i18n/LocaleContext";

export default function Login() {
  const router = useRouter();
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await authAPI.login(email, password);
      saveAuth(data.token, data.user);
      router.push(`/dashboard/${data.user.role.toLowerCase()}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] relative overflow-hidden">
      {/* Decorative localized glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-60 h-60 bg-emerald-500/5 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-60 h-60 bg-cyan-500/5 rounded-full filter blur-3xl pointer-events-none" />

      <div className="glass-card-premium p-6 sm:p-10 w-full max-w-md animate-fade-up border border-white/80 relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 mx-auto mb-4 flex items-center justify-center text-2xl font-black text-black shadow-lg shadow-emerald-500/15 transition-transform hover:scale-105 hover:rotate-3 duration-300">
            A
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">{t("auth.loginTitle")}</h1>
          <p className="text-slate-400 text-sm font-sans">{t("auth.loginSubtitle")}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 glass-sm border border-red-500/20 text-red-400 text-sm rounded-lg font-sans">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div>
            <label htmlFor="login-email" className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">{t("auth.email")}</label>
            <input
              id="login-email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder={t("auth.placeholderEmail")}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">{t("auth.password")}</label>
            <input
              id="login-password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder={t("auth.placeholderPassword")}
              required
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <span>{loading ? t("auth.signingIn") : t("auth.loginButton")}</span>
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-500 font-sans">
          {t("auth.noAccount")}{" "}
          <Link href="/register" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">{t("auth.createOne")}</Link>
        </p>

        {/* Social Proof */}
        <div className="mt-6 pt-6 border-t border-white/5 text-center">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Join 10k+ athletes & fitness enthusiasts
          </p>
        </div>
      </div>
    </div>
  );
}
