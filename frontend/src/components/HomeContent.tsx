"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useLocale } from "@/i18n/LocaleContext";
import { StarIcon } from "./StarIcon";

function AnimatedCounter({ target, suffix = "", duration = 2000 }: { target: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const counted = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || counted.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !counted.current) {
          counted.current = true;
          const start = performance.now();
          const animate = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/5 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left text-white font-semibold text-sm hover:text-emerald-300 transition-colors"
      >
        {question}
        <span className={`text-emerald-400 text-lg transition-transform duration-300 ${open ? "rotate-45" : ""}`}>+</span>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? "max-h-96 pb-5" : "max-h-0"}`}>
        <p className="text-slate-400 text-sm leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

export default function HomeContent() {
  const { t } = useLocale();

  const features = [
    {
      icon: (
        <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      color: "from-emerald-500/20 to-emerald-500/5",
      border: "hover:border-emerald-500/30",
      glow: "hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]",
      title: t("home.feature1Title"),
      desc: t("home.feature1Desc"),
    },
    {
      icon: (
        <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      color: "from-blue-500/20 to-blue-500/5",
      border: "hover:border-blue-500/30",
      glow: "hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]",
      title: t("home.feature2Title"),
      desc: t("home.feature2Desc"),
    },
    {
      icon: (
        <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
        </svg>
      ),
      color: "from-purple-500/20 to-purple-500/5",
      border: "hover:border-purple-500/30",
      glow: "hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]",
      title: t("home.feature3Title"),
      desc: t("home.feature3Desc"),
    },
  ];

  const testimonials = [
    { name: t("home2.testimonial1Name"), role: t("home2.testimonial1Role"), text: t("home2.testimonial1Text"), rating: 5 },
    { name: t("home2.testimonial2Name"), role: t("home2.testimonial2Role"), text: t("home2.testimonial2Text"), rating: 5 },
    { name: t("home2.testimonial3Name"), role: t("home2.testimonial3Role"), text: t("home2.testimonial3Text"), rating: 4 },
  ];

  const faqs = [
    { q: t("home2.faq1Q"), a: t("home2.faq1A") },
    { q: t("home2.faq2Q"), a: t("home2.faq2A") },
    { q: t("home2.faq3Q"), a: t("home2.faq3A") },
    { q: t("home2.faq4Q"), a: t("home2.faq4A") },
  ];

  return (
    <div className="flex flex-col items-center w-full relative">

      {/* ====== HERO ====== */}
      <section className="flex flex-col items-center text-center pt-12 pb-20 max-w-5xl relative z-10">
        <div className="animate-fade-up mb-6">
          <div className="badge badge-emerald border border-emerald-500/20 py-1.5 px-4 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse-glow" />
            {t("home.badge")}
          </div>
        </div>

        <h1 className="animate-fade-up-d1 text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] mb-8 select-none break-words">
          {t("home.title")}{" "}
          <span className="gradient-text bg-gradient-shift">{t("home.highlight")}</span>
        </h1>

        <p className="animate-fade-up-d2 text-lg sm:text-xl text-slate-400 max-w-3xl mb-12 leading-relaxed font-sans">
          {t("home.subtitle")}
        </p>

        <div className="animate-fade-up-d3 flex flex-wrap justify-center gap-4">
          <Link href="/ai" className="btn-primary text-lg px-8 py-3.5 shadow-lg">
            <span>{t("home.ctaAI")}</span>
          </Link>
          <Link href="/marketplace" className="btn-ghost text-lg px-8 py-3.5 backdrop-blur-md">
            {t("home.ctaExperts")}
          </Link>
        </div>

        <div className="animate-fade-up-d3 flex items-center gap-8 mt-16 text-xs text-slate-500 uppercase tracking-widest font-semibold">
          <span className="flex items-center gap-1.5">
            <span className="text-emerald-400">✔</span> {t("home.secure")}
          </span>
          <span className="text-slate-700">•</span>
          <span className="flex items-center gap-1.5">
            <span className="text-cyan-400">⚡</span> {t("home.aiPowered")}
          </span>
          <span className="text-slate-700">•</span>
          <span className="flex items-center gap-1.5">
            <span className="text-purple-400">✦</span> {t("home.realtime")}
          </span>
        </div>
      </section>

      {/* ====== FEATURES ====== */}
      <section className="grid md:grid-cols-3 gap-6 w-full mb-24 relative z-10">
        {features.map((f, i) => (
          <div key={i} className={`glass card-hover p-8 border border-white/5 ${f.border} ${f.glow} transition-all duration-500 flex flex-col justify-between`}>
            <div>
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-6 border border-white/5`}>
                {f.icon}
              </div>
              <h3 className="text-xl font-bold mb-3 text-white tracking-tight">{f.title}</h3>
              <p className="text-slate-400 leading-relaxed text-sm font-sans">{f.desc}</p>
            </div>
          </div>
        ))}
      </section>

      {/* ====== STATS ====== */}
      <section className="w-full mb-24 relative z-10">
        <div className="glass-card-premium p-10 border border-white/10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 text-center">
            {[
              { target: 10, suffix: "K+", label: t("home.stat1label"), color: "text-emerald-400" },
              { target: 500, suffix: "+", label: t("home.stat2label"), color: "text-blue-400" },
              { target: 50, suffix: "K+", label: t("home.stat3label"), color: "text-purple-400" },
              { target: 49, suffix: "", label: t("home.stat4label"), color: "text-amber-400" },
            ].map((s, i) => (
              <div key={i} className="flex flex-col justify-center">
                <p className={`text-4xl lg:text-5xl font-black tracking-tight ${s.color}`}>
                  <AnimatedCounter target={s.target} suffix={s.suffix} />
                </p>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== TESTIMONIALS ====== */}
      <section className="w-full mb-24 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-white tracking-tight mb-3">{t("home2.testimonialsTitle")}</h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">{t("home2.testimonialsSubtitle")}</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((item, i) => (
            <div key={i} className="glass p-8 border border-white/5 rounded-2xl flex flex-col">
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: item.rating }).map((_, si) => (
                  <StarIcon key={si} size={16} className="text-amber-400" />
                ))}
              </div>
              <p className="text-slate-300 text-sm leading-relaxed flex-1 mb-6 italic">&ldquo;{item.text}&rdquo;</p>
              <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-sm font-black text-black">
                  {item.name[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{item.name}</p>
                  <p className="text-xs text-slate-500">{item.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ====== HOW IT WORKS ====== */}
      <section className="w-full mb-28 text-center relative z-10">
        <h2 className="text-3xl font-extrabold mb-3 text-white tracking-tight">{t("home.howTitle")}</h2>
        <p className="text-slate-400 mb-16 text-base max-w-xl mx-auto">{t("home.howSubtitle")}</p>

        <div className="grid md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-[4.5rem] left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-purple-500/20 z-0" />

          {[
            { step: "01", title: t("home.step1Title"), desc: t("home.step1Desc"), border: "border-emerald-500/30", text: "text-emerald-400" },
            { step: "02", title: t("home.step2Title"), desc: t("home.step2Desc"), border: "border-cyan-500/30", text: "text-cyan-400" },
            { step: "03", title: t("home.step3Title"), desc: t("home.step3Desc"), border: "border-purple-500/30", text: "text-purple-400" },
          ].map((s, i) => (
            <div key={i} className="relative group">
              <span className="text-7xl font-black text-white/[0.02] absolute -top-8 left-1/2 -translate-x-1/2 select-none group-hover:text-white/[0.04] transition-all duration-300">
                {s.step}
              </span>
              <div className="relative pt-6">
                <div className={`w-14 h-14 rounded-full bg-slate-900 border-2 ${s.border} mx-auto mb-5 flex items-center justify-center ${s.text} font-black text-base shadow-[0_0_15px_rgba(0,0,0,0.5)] relative z-10 transition-transform duration-300 group-hover:scale-110`}>
                  {s.step}
                </div>
                <h3 className="text-xl font-bold mb-3 text-white tracking-tight">{s.title}</h3>
                <p className="text-slate-400 text-sm max-w-xs mx-auto leading-relaxed font-sans">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ====== FAQ ====== */}
      <section className="w-full mb-24 relative z-10 max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-white tracking-tight mb-3">{t("home2.faqTitle")}</h2>
          <p className="text-slate-400 text-sm">{t("home2.faqSubtitle")}</p>
        </div>
        <div className="glass rounded-2xl px-8 border border-white/5">
          {faqs.map((faq, i) => (
            <FaqItem key={i} question={faq.q} answer={faq.a} />
          ))}
        </div>
      </section>

      {/* ====== CTA ====== */}
      <section className="w-full glass-card-premium p-14 text-center mb-12 relative overflow-hidden z-10 border border-white/10 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10 pointer-events-none" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full filter blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/5 rounded-full filter blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 text-white tracking-tight">{t("home.ctaTitle")}</h2>
          <p className="text-slate-400 mb-8 max-w-md mx-auto leading-relaxed text-sm font-sans">{t("home.ctaDesc")}</p>
          <Link href="/register" className="btn-primary text-base px-8 py-3.5 shadow-lg">
            <span>{t("home.ctaButton")}</span>
          </Link>
        </div>
      </section>

    </div>
  );
}
