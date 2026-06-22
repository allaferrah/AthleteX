"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authAPI } from "@/lib/api";
import { saveAuth } from "@/lib/auth";
import { useLocale } from "@/i18n/LocaleContext";

export default function Register() {
  const router = useRouter();
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("USER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await authAPI.register(email, password, role);
      const loginData = await authAPI.login(email, password);
      saveAuth(loginData.token, loginData.user);
      router.push(`/dashboard/${loginData.user.role.toLowerCase()}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[85vh] relative overflow-hidden">
      {/* Decorative localized glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-60 h-60 bg-emerald-500/5 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-60 h-60 bg-cyan-500/5 rounded-full filter blur-3xl pointer-events-none" />

      <div className="glass-card-premium p-6 sm:p-10 w-full max-w-md animate-fade-up border border-white/10 relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 mx-auto mb-4 flex items-center justify-center text-2xl font-black text-black shadow-lg shadow-emerald-500/10 transition-transform hover:scale-105 hover:rotate-3 duration-300">
            A
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">{t("auth.registerTitle")}</h1>
          <p className="text-slate-400 text-sm font-sans">{t("auth.registerSubtitle")}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 glass-sm border border-red-500/20 text-red-400 text-sm rounded-lg font-sans">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="flex flex-col gap-5">
          <div>
            <label htmlFor="register-email" className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">{t("auth.email")}</label>
            <input
              id="register-email"
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
            <label htmlFor="register-password" className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">{t("auth.password")}</label>
            <input
              id="register-password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder={t("auth.placeholderPasswordRegister")}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">{t("auth.iAmA")}</label>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setRole("USER")}
                className={`p-4 rounded-xl text-sm font-semibold transition-all border cursor-pointer ${
                  role === "USER"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                    : "border-white/5 bg-white/[0.02] text-slate-400 hover:border-white/10"
                }`}
              >
                {t("auth.roleUser")}
                <span className="block text-[11px] mt-1.5 font-normal opacity-70 font-sans leading-snug">{t("auth.userDesc")}</span>
              </button>
              <button
                type="button"
                onClick={() => setRole("EXPERT")}
                className={`p-4 rounded-xl text-sm font-semibold transition-all border cursor-pointer ${
                  role === "EXPERT"
                    ? "border-blue-500 bg-blue-500/10 text-blue-400"
                    : "border-white/5 bg-white/[0.02] text-slate-400 hover:border-white/10"
                }`}
              >
                {t("auth.roleExpert")}
                <span className="block text-[11px] mt-1.5 font-normal opacity-70 font-sans leading-snug">{t("auth.expertDesc")}</span>
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-2 disabled:opacity-50 cursor-pointer"
          >
            <span>{loading ? t("auth.creatingAccount") : t("auth.registerButton")}</span>
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-500 font-sans">
          {t("auth.haveAccount")}{" "}
          <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">{t("auth.signIn")}</Link>
        </p>

        {/* Social Proof */}
        <div className="mt-6 pt-6 border-t border-white/5 text-center">
          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
            Join 10k+ athletes & fitness enthusiasts
          </p>
        </div>
      </div>
    </div>
  );
}
