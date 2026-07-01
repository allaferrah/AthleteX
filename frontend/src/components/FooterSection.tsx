"use client";

import Link from "next/link";
import Image from "next/image";
import { useLocale } from "@/i18n/LocaleContext";

export default function FooterSection() {
  const { t, locale } = useLocale();
  const isAr = locale === "ar";

  return (
    <footer className="relative z-10 border-t border-white/5 bg-slate-950/40 backdrop-blur-md pt-16 pb-8 px-6 sm:px-8 lg:px-12 w-full mt-24">
      {/* Mesh glow effects inside footer */}
      <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-emerald-500/5 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-72 h-72 bg-cyan-500/5 rounded-full filter blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 mb-12">
        {/* Brand Section */}
        <div className="md:col-span-4 flex flex-col gap-4">
          <Link href="/" className="flex items-center gap-2 group self-start">
            <Image src="/logo.png" alt="AthleteX" width={32} height={32} className="rounded-lg transition-all duration-300 group-hover:scale-110" />
            <span className="text-lg font-bold gradient-text tracking-tight">AthleteX</span>
          </Link>
          <p className="text-slate-400 text-xs leading-relaxed max-w-sm font-sans mt-2">
            {isAr 
              ? "منصة AthleteX تدمج بين أقوى تقنيات الذكاء الاصطناعي لتصميم الأنظمة الغذائية والتمارين الرياضية وخبرات نخبة المدربين وأخصائيي التغذية المعتمدين." 
              : "AthleteX seamlessly blends state-of-the-art AI-powered custom nutrition and workout plans with a marketplace of elite, verified fitness and dietary professionals."}
          </p>
          
          {/* Social Icons */}
          <div className="flex gap-4 mt-2">
            {["twitter", "instagram", "discord", "github"].map((s, idx) => (
              <a 
                key={idx} 
                href="#" 
                className="w-8 h-8 rounded-lg bg-slate-800 border border-white/5 flex items-center justify-center text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all duration-300 hover:-translate-y-1 shadow-sm"
              >
                <span className="capitalize text-[10px] font-bold">{s[0]}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Quick Links Column */}
        <div className="md:col-span-3 flex flex-col gap-4">
          <h4 className="text-slate-200 text-xs font-bold uppercase tracking-widest">
            {isAr ? "روابط سريعة" : "Platform"}
          </h4>
          <div className="flex flex-col gap-2.5 text-xs text-slate-400 font-medium">
            <Link href="/marketplace" className="hover:text-emerald-400 transition-colors">{t("nav.marketplace")}</Link>
            <Link href="/marketplace/sports" className="hover:text-emerald-400 transition-colors">{t("nav.sports")}</Link>
            <Link href="/marketplace/nutrition" className="hover:text-emerald-400 transition-colors">{t("nav.nutrition")}</Link>
            <Link href="/ai" className="hover:text-emerald-400 transition-colors">{t("nav.aiAssistant")}</Link>
          </div>
        </div>

        {/* Newsletter Signup (UI Only) */}
        <div className="md:col-span-5 flex flex-col gap-4">
          <h4 className="text-slate-200 text-xs font-bold uppercase tracking-widest">
            {isAr ? "النشرة الإخبارية" : "Newsletter"}
          </h4>
          <p className="text-slate-400 text-xs font-sans">
            {isAr 
              ? "اشترك لتلقي أحدث نصائح التغذية والتمارين الرياضية مباشرة في بريدك." 
              : "Subscribe to receive weekly expert fitness, health tips, and direct product updates."}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 w-full mt-1">
            <input 
              id="footer-email"
              name="email"
              type="email" 
              placeholder={isAr ? "بريدك الإلكتروني..." : "Your email address..."} 
              className="bg-slate-800 border border-white/5 focus:border-emerald-500/30 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-400 outline-none w-full transition-all duration-300 font-sans"
              autoComplete="email"
            />
            <button className="btn-primary !py-2 !px-4 text-xs font-bold whitespace-nowrap">
              <span>{isAr ? "اشترك" : "Subscribe"}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="divider-gradient mb-8" />

      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] text-slate-500 font-medium">
        <p className="font-sans">{t("footer.rights")}</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-white transition-colors">{t("footer.privacy")}</a>
          <a href="#" className="hover:text-white transition-colors">{t("footer.terms")}</a>
          <a href="#" className="hover:text-white transition-colors">{t("footer.support")}</a>
        </div>
      </div>
    </footer>
  );
}
