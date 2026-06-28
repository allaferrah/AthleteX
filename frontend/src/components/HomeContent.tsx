"use client";

import Link from "next/link";
import { useState, useEffect, useRef, Fragment } from "react";
import { useLocale } from "@/i18n/LocaleContext";
import { StarIcon } from "./StarIcon";

/* ──────────────── INTERFACES ──────────────── */

interface AnimatedCounterProps {
  target: number;
  suffix?: string;
  duration?: number;
}

interface FaqItemProps {
  question: string;
  answer: string;
}

interface SloganRotatorProps {
  slogans: string[];
}

interface StatCardProps {
  value: number;
  suffix: string;
  label: string;
  color: string;
  delay?: string;
}

interface HexBadgeProps {
  icon: string;
  label: string;
}

/* ──────────────── DATA CONSTANTS ──────────────── */

const TRUST_AVATARS = ["A", "K", "S", "M", "R"];

const MARQUEE_ITEMS = [
  "AI Coaching", "Smart Nutrition", "Expert Marketplace", "Real-Time Analytics",
  "Provably Fair", "Community Driven", "Goal Tracking", "Custom Plans",
  "AI Coaching", "Smart Nutrition", "Expert Marketplace", "Real-Time Analytics",
  "Provably Fair", "Community Driven", "Goal Tracking", "Custom Plans",
];

const FEATURES_DATA = [
  { icon: "🧠", titleKey: "home.feature1Title", descKey: "home.feature1Desc", color: "#10b981" },
  { icon: "🛡️", titleKey: "home.feature2Title", descKey: "home.feature2Desc", color: "#06b6d4" },
  { icon: "📊", titleKey: "home.feature3Title", descKey: "home.feature3Desc", color: "#8b5cf6" },
];

const STATS_DATA = [
  { target: 10, suffix: "K+", labelKey: "home.stat1label", color: "#10b981" },
  { target: 500, suffix: "+", labelKey: "home.stat2label", color: "#06b6d4" },
  { target: 50, suffix: "K+", labelKey: "home.stat3label", color: "#a78bfa" },
  { target: 49, suffix: "", labelKey: "home.stat4label", color: "#fbbf24" },
];

const PROCESS_STEPS = [
  { step: "01", titleKey: "home.step1Title", descKey: "home.step1Desc" },
  { step: "02", titleKey: "home.step2Title", descKey: "home.step2Desc" },
  { step: "03", titleKey: "home.step3Title", descKey: "home.step3Desc" },
];

const TESTIMONIALS_DATA = [
  { nameKey: "home2.testimonial1Name", roleKey: "home2.testimonial1Role", textKey: "home2.testimonial1Text", rating: 5 },
  { nameKey: "home2.testimonial2Name", roleKey: "home2.testimonial2Role", textKey: "home2.testimonial2Text", rating: 5 },
  { nameKey: "home2.testimonial3Name", roleKey: "home2.testimonial3Role", textKey: "home2.testimonial3Text", rating: 4 },
];

const FAQS_DATA = [
  { qKey: "home2.faq1Q", aKey: "home2.faq1A" },
  { qKey: "home2.faq2Q", aKey: "home2.faq2A" },
  { qKey: "home2.faq3Q", aKey: "home2.faq3A" },
  { qKey: "home2.faq4Q", aKey: "home2.faq4A" },
];

/* ──────────────── SUB-COMPONENTS ──────────────── */

function AnimatedCounter({ target, suffix = "", duration = 2000 }: AnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let counted = false;
    let animationFrameId: number;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !counted) {
          counted = true;
          const start = performance.now();

          const animate = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic

            setCount(Math.round(eased * target));

            if (progress < 1) {
              animationFrameId = requestAnimationFrame(animate);
            }
          };

          animationFrameId = requestAnimationFrame(animate);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [target, duration]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
}

function FaqItem({ question, answer }: FaqItemProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`faq-item ${open ? "faq-open" : ""}`}>
      <button 
        type="button" 
        onClick={() => setOpen((prev) => !prev)} 
        className="faq-trigger"
        aria-expanded={open}
      >
        <span>{question}</span>
        <span className={`faq-chevron ${open ? "rotate" : ""}`} aria-hidden="true">+</span>
      </button>
      <div className={`faq-body ${open ? "faq-body-open" : ""}`} aria-hidden={!open}>
        <p>{answer}</p>
      </div>
    </div>
  );
}

function SloganRotator({ slogans }: SloganRotatorProps) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((p) => (p + 1) % slogans.length), 3500);
    return () => clearInterval(t);
  }, [slogans.length]);

  return (
    <div className="slogan-wrap">
      {slogans.map((s, i) => (
        <span 
          key={i} 
          className={`slogan-item ${i === idx ? "slogan-active" : "slogan-hidden"}`}
          aria-hidden={i !== idx}
        >
          {s}
        </span>
      ))}
    </div>
  );
}

function OrbField() {
  return (
    <div className="orb-field" aria-hidden="true">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
      <div className="orb orb-4" />
      <div className="grid-overlay" />
    </div>
  );
}

function StatCard({ value, suffix, label, color, delay = "0s" }: StatCardProps) {
  return (
    <div className="stat-card float-card" style={{ animationDelay: delay }}>
      <div className="stat-card-accent" style={{ background: color }} />
      <p className="stat-card-num" style={{ color }}>
        <AnimatedCounter target={value} suffix={suffix} />
      </p>
      <p className="stat-card-label">{label}</p>
    </div>
  );
}

function HexBadge({ icon, label }: HexBadgeProps) {
  return (
    <div className="hex-badge">
      <span className="hex-icon" aria-hidden="true">{icon}</span>
      <span className="hex-label">{label}</span>
    </div>
  );
}

/* ──────────────── MAIN COMPONENT ──────────────── */

export default function HomeContent() {
  const { t } = useLocale();

  const slogans = [t("slogan.main"), t("slogan.sub"), t("home.highlight")];

  return (
    <>
      <style>{PAGE_STYLES}</style>
      <OrbField />

      <div className="page-root">
        {/* ══════════ HERO ══════════ */}
        <section className="hero-section">
          <div className="hero-left">
            <div className="hero-eyebrow">
              <span className="hero-eyebrow-dot" />
              {t("home.badge")}
            </div>

            <h1 className="hero-h1">
              {t("home.title")}
              <br />
              <span className="grad-text">{t("home.highlight")}</span>
              <br />
              <span className="outline-text">{t("slogan.main")}</span>
            </h1>

            <div style={{ marginBottom: "1.5rem" }}>
              <SloganRotator slogans={slogans} />
            </div>

            <p className="hero-sub">{t("home.subtitle")}</p>

            <div className="hero-cta-row">
              <Link href="/ai" className="btn-hero-primary">
                <span aria-hidden="true">⚡</span> {t("home.ctaAI")}
              </Link>
              <Link href="/marketplace" className="btn-hero-ghost">
                {t("home.ctaExperts")} <span aria-hidden="true">→</span>
              </Link>
            </div>

            <div className="hero-trust">
              <div className="trust-avatars">
                {TRUST_AVATARS.map((l, i) => (
                  <div key={i} className="trust-av" style={{ zIndex: 5 - i }}>
                    {l}
                  </div>
                ))}
              </div>
              <span className="trust-text">
                <strong>10,000+</strong> {t("home.stat1label")}
              </span>
            </div>

            <div className="hex-row" style={{ marginTop: "2rem" }}>
              <HexBadge icon="✔" label={t("home.secure")} />
              <HexBadge icon="⚡" label={t("home.aiPowered")} />
              <HexBadge icon="✦" label={t("home.realtime")} />
            </div>
          </div>

          {/* ─ Dashboard Panel (Right) ─ */}
          <div className="hero-right">
            <div style={{ position: "relative", width: "100%", maxWidth: 420 }}>
              <div className="hero-dashboard">
                <div className="dash-header">
                  <span className="dash-title">AI Coach Dashboard</span>
                  <span className="dash-badge">● Live</span>
                </div>
                
                <div className="dash-big-num">
                  <AnimatedCounter target={34} suffix="%" />
                  <span aria-hidden="true">↑</span>
                </div>
                
                <div className="dash-sub">
                  {t("home.stat4label")} — {t("home.stat3label")}
                </div>

                {/* sparkline */}
                <div className="sparkline" aria-hidden="true">
                  <svg viewBox="0 0 300 60" preserveAspectRatio="none" fill="none">
                    <defs>
                      <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity=".35" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0 50 L30 42 L60 38 L90 30 L120 28 L150 20 L180 22 L210 14 L240 12 L270 8 L300 5"
                      stroke="#10b981"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M0 50 L30 42 L60 38 L90 30 L120 28 L150 20 L180 22 L210 14 L240 12 L270 8 L300 5 L300 60 L0 60Z"
                      fill="url(#sg)"
                    />
                  </svg>
                </div>

                <div className="dash-row">
                  <div className="dash-mini">
                    <div className="dash-mini-label">Calories</div>
                    <div className="dash-mini-val green">2,310</div>
                  </div>
                  <div className="dash-mini">
                    <div className="dash-mini-label">Protein</div>
                    <div className="dash-mini-val cyan">182g</div>
                  </div>
                  <div className="dash-mini">
                    <div className="dash-mini-label">Goal</div>
                    <div className="dash-mini-val purple">85%</div>
                  </div>
                </div>
              </div>

              {/* floating pills */}
              <div className="float-pill pill-1">
                <div className="pill-icon" style={{ background: "rgba(16,185,129,.12)" }} aria-hidden="true">🏃</div>
                <div>
                  <div className="pill-val">+12%</div>
                  <div className="pill-lbl">Performance</div>
                </div>
              </div>
              <div className="float-pill pill-2">
                <div className="pill-icon" style={{ background: "rgba(6,182,212,.12)" }} aria-hidden="true">🥗</div>
                <div>
                  <div className="pill-val">On Track</div>
                  <div className="pill-lbl">Nutrition</div>
                </div>
              </div>
              <div className="float-pill pill-3">
                <div className="pill-icon" style={{ background: "rgba(139,92,246,.12)" }} aria-hidden="true">💪</div>
                <div>
                  <div className="pill-val">Day 42</div>
                  <div className="pill-lbl">Streak</div>
                </div>
              </div>
            </div>

            {/* side stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", width: "100%", maxWidth: 420 }}>
              <StatCard value={10} suffix="K+" label={t("home.stat1label")} color="#10b981" delay="0s" />
              <StatCard value={500} suffix="+" label={t("home.stat2label")} color="#06b6d4" delay=".5s" />
            </div>
          </div>
        </section>

        {/* ══════════ MARQUEE ══════════ */}
        <div className="marquee-band">
          <div className="marquee-track">
            {MARQUEE_ITEMS.map((item, i) => (
              <div key={i} className="marquee-item">
                <span className="marquee-dot" />
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* ══════════ FEATURES ══════════ */}
        <section className="features-section">
          <div className="features-head">
            <div>
              <div className="section-eyebrow">{t("home.badge")}</div>
              <h2 className="section-h2">
                {t("home.feature1Title").split(" ")[0]}{" "}
                <span className="grad-text">{t("home.highlight")}</span>
              </h2>
            </div>
            <p className="section-sub">{t("home.subtitle")}</p>
          </div>

          <div className="feat-grid">
            {FEATURES_DATA.map((f, i) => (
              <div key={i} className="feat-card">
                <div className="feat-num-bg grad-text">0{i + 1}</div>
                <div className="feat-icon-wrap" style={{ background: `${f.color}15`, border: `1px solid ${f.color}30` }}>
                  <span style={{ fontSize: "1.6rem" }} aria-hidden="true">{f.icon}</span>
                </div>
                <h3 className="feat-h3">{t(f.titleKey)}</h3>
                <p className="feat-p">{t(f.descKey)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════ STATS ══════════ */}
        <section className="stats-section">
          <div className="stats-inner">
            <div className="stats-grid">
              {STATS_DATA.map((s, i) => (
                <Fragment key={i}>
                  {i > 0 && <div className="stat-divider" />}
                  <div className="stat-item">
                    <div className="stat-num" style={{ color: s.color }}>
                      <AnimatedCounter target={s.target} suffix={s.suffix} />
                    </div>
                    <div className="stat-label">{t(s.labelKey)}</div>
                  </div>
                </Fragment>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════ PROCESS ══════════ */}
        <section className="process-section">
          <div style={{ textAlign: "center", marginBottom: "1rem" }}>
            <div className="section-eyebrow" style={{ justifyContent: "center" }}>
              {t("home.howTitle")}
            </div>
            <h2 className="section-h2" style={{ textAlign: "center" }}>
              <span className="grad-text">{t("home.howSubtitle")}</span>
            </h2>
          </div>
          <div className="process-grid">
            {PROCESS_STEPS.map((s, i) => (
              <div key={i} className="process-card">
                <div className="process-step-num">{s.step}</div>
                <h3 className="process-h3">{t(s.titleKey)}</h3>
                <p className="process-p">{t(s.descKey)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════ TESTIMONIALS ══════════ */}
        <section className="testi-section">
          <div style={{ textAlign: "center", marginBottom: "1rem" }}>
            <div className="section-eyebrow" style={{ justifyContent: "center" }}>
              {t("home2.testimonialsTitle")}
            </div>
            <h2 className="section-h2" style={{ textAlign: "center" }}>
              <span className="grad-text">{t("home2.testimonialsSubtitle")}</span>
            </h2>
          </div>
          <div className="testi-grid">
            {TESTIMONIALS_DATA.map((item, i) => (
              <div key={i} className="testi-card">
                <div className="testi-stars">
                  {Array.from({ length: item.rating }).map((_, si) => (
                    <StarIcon key={si} size={15} className="text-amber-400" aria-hidden="true" />
                  ))}
                </div>
                <div className="testi-quote-mark grad-text">&quot;</div>
                <p className="testi-text">{t(item.textKey)}</p>
                <div className="testi-author">
                  <div className="testi-av" aria-hidden="true">
                    {t(item.nameKey).charAt(0)}
                  </div>
                  <div>
                    <div className="testi-name">{t(item.nameKey)}</div>
                    <div className="testi-role">{t(item.roleKey)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════ FAQ ══════════ */}
        <section className="faq-section">
          <div className="faq-layout">
            <div className="faq-sticky">
              <div className="section-eyebrow">{t("home2.faqTitle")}</div>
              <h2 className="section-h2">
                <span className="grad-text">{t("home2.faqSubtitle")}</span>
              </h2>
            </div>
            <div className="faq-list">
              {FAQS_DATA.map((faq, i) => (
                <FaqItem key={i} question={t(faq.qKey)} answer={t(faq.aKey)} />
              ))}
            </div>
          </div>
        </section>

        {/* ══════════ CTA ══════════ */}
        <section className="cta-section">
          <div className="cta-inner">
            <div className="cta-glow" />
            <h2 className="cta-h2">
              {t("home.ctaTitle")}
              <br />
              <span className="grad-text">{t("home.highlight")}</span>
            </h2>
            <p className="cta-sub">{t("home.ctaDesc")}</p>
            <Link href="/register" className="btn-cta">
              {t("home.ctaButton")}
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}

/* ──────────────── GLOBAL STYLES ──────────────── */

const PAGE_STYLES = `
/* ═══ RESET & BASE ═══ */
*, *::before, *::after {
  box-sizing: border-box;
}

:root {
  --teal:   #10b981;
  --cyan:   #06b6d4;
  --teal-g: #0d9488;
  --navy:   #0f172a;
  --navy2:  #1e293b;
  --panel:  rgba(15, 23, 42, 0.85);
  --glass:  rgba(255, 255, 255, 0.07);
  --glassb: rgba(255, 255, 255, 0.12);
  --light:  #f8fafc;
  --light2: #e2e8f0;
  --muted:  #94a3b8;
  --white:  #ffffff;
  --grad:   linear-gradient(135deg, #10b981, #06b6d4);
  --grad2:  linear-gradient(135deg, #06b6d4, #8b5cf6);
  --shadow-teal: 0 0 40px rgba(16, 185, 129, 0.3);
  --shadow-cyan: 0 0 40px rgba(6, 182, 212, 0.3);
}

/* ═══ UTILITIES ═══ */
.grad-text {
  background: var(--grad);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* ═══ ORB BACKGROUND ═══ */
.orb-field {
  position: fixed; 
  inset: 0; 
  pointer-events: none; 
  z-index: 0; 
  overflow: hidden;
  background: transparent;
}
.orb {
  position: absolute; 
  border-radius: 50%; 
  filter: blur(80px); 
  opacity: 0.45; 
  animation: orbdrift 18s ease-in-out infinite;
}
.orb-1 { 
  width: 700px; height: 700px; top: -200px; left: -150px; 
  background: radial-gradient(circle, rgba(16, 185, 129, 0.35), transparent 70%); 
  animation-duration: 20s; 
}
.orb-2 { 
  width: 600px; height: 600px; top: 30%; right: -100px; 
  background: radial-gradient(circle, rgba(6, 182, 212, 0.3), transparent 70%); 
  animation-duration: 16s; 
  animation-delay: -5s; 
}
.orb-3 { 
  width: 500px; height: 500px; bottom: -100px; left: 30%; 
  background: radial-gradient(circle, rgba(139, 92, 246, 0.2), transparent 70%); 
  animation-duration: 22s; 
  animation-delay: -10s; 
}
.orb-4 { 
  width: 400px; height: 400px; top: 60%; left: -50px; 
  background: radial-gradient(circle, rgba(16, 185, 129, 0.2), transparent 70%); 
  animation-duration: 25s; 
  animation-delay: -8s; 
}
@keyframes orbdrift {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(60px, -40px) scale(1.08); }
  66% { transform: translate(-40px, 50px) scale(0.95); }
}
.grid-overlay {
  position: absolute; 
  inset: 0;
  background-image: 
    linear-gradient(rgba(16, 185, 129, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(16, 185, 129, 0.06) 1px, transparent 1px);
  background-size: 60px 60px;
  mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black, transparent);
}

/* ═══ LAYOUT ═══ */
.page-root { 
  position: relative; 
  z-index: 1; 
}

/* ═══ HERO ═══ */
.hero-section {
  min-height: 100vh;
  display: grid; 
  grid-template-columns: 1fr 1fr;
  align-items: center; 
  gap: 3rem;
  padding: 6rem clamp(1.5rem, 6vw, 5rem) 4rem;
  position: relative;
}
.hero-section::after {
  content: '';
  position: absolute; 
  inset: 0;
  background: linear-gradient(to right, rgba(248, 250, 252, 0.7) 40%, transparent 70%);
  pointer-events: none; 
  z-index: -1;
}

/* Hero Left */
.hero-left { 
  display: flex; 
  flex-direction: column; 
  gap: 0; 
}
.hero-eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  background: rgba(16, 185, 129, 0.12); 
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #0d9488; font-size: 11px; font-weight: 700; 
  letter-spacing: .14em; text-transform: uppercase;
  padding: 6px 16px; border-radius: 100px; 
  width: fit-content; margin-bottom: 1.5rem;
}
.hero-eyebrow-dot { 
  width: 6px; height: 6px; background: var(--teal); 
  border-radius: 50%; animation: pulse 2s infinite; 
}
@keyframes pulse { 
  0%, 100% { opacity: 1; transform: scale(1) } 
  50% { opacity: .4; transform: scale(1.3) } 
}

.hero-h1 {
  font-size: clamp(2.6rem, 5vw, 4rem);
  font-weight: 800; line-height: 1.08; letter-spacing: -0.03em;
  color: var(--navy); margin-bottom: 1rem;
}
.hero-h1 .outline-text {
  -webkit-text-stroke: 2px var(--teal); color: transparent;
}
.hero-sub {
  font-size: 0.9rem; color: #475569; line-height: 1.8;
  max-width: 480px; margin-bottom: 2rem;
}
.hero-cta-row { 
  display: flex; gap: 1rem; flex-wrap: wrap; 
  align-items: center; margin-bottom: 3rem; 
}
.btn-hero-primary {
  background: var(--grad); color: white; border: none;
  padding: 14px 36px; border-radius: 14px;
  font-size: 15px; font-weight: 700; letter-spacing: .04em;
  cursor: pointer; position: relative; overflow: hidden;
  box-shadow: 0 8px 32px rgba(16, 185, 129, 0.4);
  transition: transform .2s, box-shadow .2s;
  text-decoration: none; display: inline-flex; align-items: center; gap: 8px;
}
.btn-hero-primary::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, .2), transparent);
  pointer-events: none;
}
.btn-hero-primary:hover { 
  transform: translateY(-3px) scale(1.02); 
  box-shadow: 0 16px 48px rgba(16, 185, 129, 0.5); 
}
.btn-hero-ghost {
  background: rgba(15, 23, 42, 0.06); color: var(--navy);
  border: 1.5px solid rgba(15, 23, 42, 0.15); 
  padding: 14px 32px; border-radius: 14px;
  font-size: 15px; font-weight: 600; cursor: pointer;
  transition: all .2s; text-decoration: none; 
  display: inline-flex; align-items: center; gap: 6px;
  backdrop-filter: blur(8px);
}
.btn-hero-ghost:hover { 
  background: var(--navy); color: white; border-color: var(--navy); 
}
.hero-trust { display: flex; align-items: center; gap: 1.5rem; }
.trust-avatars { display: flex; }
.trust-av {
  width: 36px; height: 36px; border-radius: 50%;
  border: 2px solid white; margin-left: -10px;
  background: var(--grad); font-size: 12px; font-weight: 800; color: white;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.trust-av:first-child { margin-left: 0; }
.trust-text { font-size: 13px; color: #475569; }
.trust-text strong { color: var(--navy); }

/* Hero Dashboard (Right) */
.hero-right {
  position: relative; display: flex; flex-direction: column; 
  align-items: center; gap: 1.5rem;
}
.hero-dashboard {
  background: var(--panel); backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 24px;
  padding: 2rem; width: 100%; max-width: 400px;
  box-shadow: 0 40px 100px rgba(15, 23, 42, 0.5), var(--shadow-teal);
  position: relative; overflow: hidden;
}
.hero-dashboard::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: var(--grad);
}
.dash-header { 
  display: flex; align-items: center; justify-content: space-between; 
  margin-bottom: 1.5rem; 
}
.dash-title { 
  font-size: 12px; font-weight: 700; letter-spacing: .1em; 
  text-transform: uppercase; color: rgba(255, 255, 255, .5); 
}
.dash-badge {
  font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
  background: rgba(16, 185, 129, .2); color: var(--teal); 
  border: 1px solid rgba(16, 185, 129, .3);
  padding: 3px 10px; border-radius: 100px;
}
.dash-big-num {
  font-size: 3.5rem; font-weight: 900; color: white; line-height: 1;
  margin-bottom: .25rem; letter-spacing: -0.03em;
}
.dash-big-num span { color: var(--teal); }
.dash-sub { 
  font-size: 12px; color: rgba(255, 255, 255, .4); margin-bottom: 1.5rem; 
}
.sparkline { width: 100%; height: 60px; position: relative; margin-bottom: 1.5rem; }
.sparkline svg { width: 100%; height: 100%; }

.dash-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: .75rem; }
.dash-mini {
  background: rgba(255, 255, 255, .06); border: 1px solid rgba(255, 255, 255, .08); 
  border-radius: 12px; padding: .75rem;
}
.dash-mini-label { 
  font-size: 9px; font-weight: 700; letter-spacing: .08em; 
  text-transform: uppercase; color: rgba(255, 255, 255, .35); margin-bottom: .3rem; 
}
.dash-mini-val { font-size: 1.1rem; font-weight: 800; color: white; }
.dash-mini-val.green { color: var(--teal); }
.dash-mini-val.cyan { color: var(--cyan); }
.dash-mini-val.purple { color: #a78bfa; }

/* Floating Stats */
.float-pill {
  position: absolute; background: white;
  border-radius: 16px; padding: .6rem 1rem;
  box-shadow: 0 8px 32px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(16, 185, 129, .12);
  display: flex; align-items: center; gap: .6rem;
  animation: floatpill 4s ease-in-out infinite;
  z-index: 2;
}
.float-pill.pill-1 { top: -1rem; right: -1.5rem; animation-delay: 0s; }
.float-pill.pill-2 { bottom: 2rem; right: -2rem; animation-delay: -2s; }
.float-pill.pill-3 { top: 40%; left: -2rem; animation-delay: -1s; }
@keyframes floatpill {
  0%, 100% { transform: translateY(0) } 
  50% { transform: translateY(-10px) }
}
.pill-icon { 
  width: 32px; height: 32px; border-radius: 10px; display: flex; 
  align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; 
}
.pill-val { font-size: 14px; font-weight: 800; color: var(--navy); }
.pill-lbl { font-size: 10px; color: #94a3b8; font-weight: 600; }

/* ═══ SLOGAN ═══ */
.slogan-wrap { position: relative; min-height: 2.2em; }
.slogan-item { 
  display: block; font-size: 1rem; font-weight: 600; 
  color: var(--teal-g); position: absolute; inset: 0; 
  transition: opacity .6s, transform .6s; 
}
.slogan-active { opacity: 1; transform: translateY(0); }
.slogan-hidden { opacity: 0; transform: translateY(12px); pointer-events: none; }

/* ═══ MARQUEE BAND ═══ */
.marquee-band {
  background: var(--navy); padding: 1rem 0; overflow: hidden;
  border-top: 1px solid rgba(255, 255, 255, .06); 
  border-bottom: 1px solid rgba(255, 255, 255, .06);
  position: relative; z-index: 1;
}
.marquee-track {
  display: flex; gap: 3rem; animation: marquee 30s linear infinite; width: max-content;
}
.marquee-track:hover { animation-play-state: paused; }
@keyframes marquee { 
  0% { transform: translateX(0) } 
  100% { transform: translateX(-50%) } 
}
.marquee-item {
  display: flex; align-items: center; gap: .6rem; white-space: nowrap;
  font-size: 13px; font-weight: 700; letter-spacing: .1em; 
  text-transform: uppercase; color: rgba(255, 255, 255, .35);
}
.marquee-dot { 
  width: 4px; height: 4px; background: var(--teal); 
  border-radius: 50%; flex-shrink: 0; 
}

/* ═══ FEATURES ═══ */
.features-section { padding: 6rem clamp(1.5rem, 6vw, 5rem); position: relative; z-index: 1; }
.section-eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 11px; font-weight: 700; letter-spacing: .14em; 
  text-transform: uppercase; color: var(--teal-g); margin-bottom: 1rem;
}
.section-eyebrow::before { 
  content: ''; width: 24px; height: 2px; 
  background: var(--grad); border-radius: 2px; 
}
.section-h2 {
  font-size: clamp(2rem, 4vw, 3.5rem); font-weight: 800; line-height: 1.1;
  color: var(--navy); letter-spacing: -0.03em; margin-bottom: 1rem;
}
.section-sub { 
  color: #64748b; font-size: 1rem; line-height: 1.75; max-width: 520px; 
}
.features-head { 
  display: flex; justify-content: space-between; align-items: flex-end; 
  margin-bottom: 3.5rem; flex-wrap: wrap; gap: 2rem; 
}
.feat-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem;
}
.feat-card {
  background: white; border-radius: 20px;
  border: 1px solid rgba(16, 185, 129, .1);
  padding: 2.5rem 2rem; position: relative; overflow: hidden;
  box-shadow: 0 4px 24px rgba(15, 23, 42, .06);
  transition: transform .3s, box-shadow .3s, border-color .3s;
}
.feat-card:hover { 
  transform: translateY(-8px); 
  box-shadow: 0 24px 60px rgba(15, 23, 42, .12); 
  border-color: rgba(16, 185, 129, .3); 
}
.feat-card::after {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: var(--grad); transform: scaleX(0); transform-origin: left;
  transition: transform .4s cubic-bezier(.4, 0, .2, 1);
}
.feat-card:hover::after { transform: scaleX(1); }
.feat-num-bg {
  position: absolute; top: -1rem; right: 1rem;
  font-size: 7rem; font-weight: 900; line-height: 1;
  opacity: .06; pointer-events: none; user-select: none;
}
.feat-icon-wrap {
  width: 56px; height: 56px; border-radius: 16px; font-size: 26px;
  display: flex; align-items: center; justify-content: center; 
  margin-bottom: 1.5rem; position: relative;
}
.feat-h3 { font-size: 1.2rem; font-weight: 700; color: var(--navy); margin-bottom: .75rem; }
.feat-p { font-size: .9rem; color: #64748b; line-height: 1.75; }

/* ═══ STATS ═══ */
.stats-section { padding: 5rem clamp(1.5rem, 6vw, 5rem); position: relative; z-index: 1; }
.stats-inner {
  background: var(--navy); border-radius: 28px;
  padding: 4rem; position: relative; overflow: hidden;
  box-shadow: 0 40px 100px rgba(15, 23, 42, .4);
}
.stats-inner::before {
  content: ''; position: absolute; inset: 0;
  background: 
    radial-gradient(ellipse 60% 80% at 20% 50%, rgba(16, 185, 129, .15), transparent),
    radial-gradient(ellipse 50% 70% at 80% 50%, rgba(6, 182, 212, .12), transparent);
  pointer-events: none;
}
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2rem; position: relative; }
.stat-item { text-align: center; }
.stat-num { font-size: 3.5rem; font-weight: 900; line-height: 1; letter-spacing: -.03em; }
.stat-label { 
  font-size: 12px; font-weight: 700; letter-spacing: .1em; 
  text-transform: uppercase; color: rgba(255, 255, 255, .4); margin-top: .5rem; 
}
.stat-divider { width: 1px; background: rgba(255, 255, 255, .08); align-self: stretch; margin: auto 0; }

/* ═══ PROCESS ═══ */
.process-section { padding: 6rem clamp(1.5rem, 6vw, 5rem); position: relative; z-index: 1; }
.process-grid { 
  display: grid; grid-template-columns: repeat(3, 1fr); 
  gap: 2rem; margin-top: 3.5rem; position: relative; 
}
.process-grid::before {
  content: ''; position: absolute; top: 2.75rem; left: 15%; right: 15%; height: 2px;
  background: linear-gradient(to right, var(--teal), var(--cyan));
  opacity: .2; z-index: 0;
}
.process-card {
  background: white; border-radius: 20px; padding: 2.5rem 2rem;
  border: 1px solid rgba(16, 185, 129, .1); text-align: center; position: relative; z-index: 1;
  box-shadow: 0 4px 24px rgba(15, 23, 42, .06);
  transition: transform .3s, box-shadow .3s;
}
.process-card:hover { transform: translateY(-6px); box-shadow: 0 20px 50px rgba(15, 23, 42, .12); }
.process-step-num {
  width: 56px; height: 56px; border-radius: 50%;
  background: var(--grad); color: white; font-weight: 900; font-size: 1.1rem;
  display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;
  box-shadow: 0 8px 24px rgba(16, 185, 129, .4);
  position: relative;
}
.process-step-num::after {
  content: ''; position: absolute; inset: -4px; border-radius: 50%;
  border: 2px dashed rgba(16, 185, 129, .3); animation: spin 8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg) } }
.process-h3 { font-size: 1.15rem; font-weight: 700; color: var(--navy); margin-bottom: .75rem; }
.process-p { font-size: .875rem; color: #64748b; line-height: 1.75; }

/* ═══ TESTIMONIALS ═══ */
.testi-section { padding: 6rem clamp(1.5rem, 6vw, 5rem); position: relative; z-index: 1; }
.testi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-top: 3rem; }
.testi-card {
  background: white; border-radius: 20px; padding: 2rem;
  border: 1px solid rgba(16, 185, 129, .1);
  box-shadow: 0 4px 24px rgba(15, 23, 42, .06);
  transition: transform .3s, box-shadow .3s;
  display: flex; flex-direction: column;
}
.testi-card:hover { transform: translateY(-6px); box-shadow: 0 24px 60px rgba(15, 23, 42, .1); }
.testi-quote-mark { font-size: 3rem; line-height: 1; margin-bottom: .5rem; font-family: Georgia, serif; }
.testi-text { font-size: .9rem; color: #475569; line-height: 1.8; flex: 1; margin-bottom: 1.5rem; }
.testi-stars { display: flex; gap: 3px; margin-bottom: 1rem; }
.testi-author { 
  display: flex; align-items: center; gap: .75rem; 
  padding-top: 1rem; border-top: 1px solid #f1f5f9; 
}
.testi-av {
  width: 42px; height: 42px; border-radius: 50%; flex-shrink: 0;
  background: var(--grad); display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 900; color: white; letter-spacing: -.02em;
}
.testi-name { font-size: .9rem; font-weight: 700; color: var(--navy); }
.testi-role { font-size: .8rem; color: #94a3b8; }

/* ═══ FAQ ═══ */
.faq-section { padding: 6rem clamp(1.5rem, 6vw, 5rem); position: relative; z-index: 1; }
.faq-layout { display: grid; grid-template-columns: 1fr 1.4fr; gap: 4rem; align-items: start; }
.faq-sticky { position: sticky; top: 6rem; }
.faq-deco {
  margin-top: 2rem; background: var(--navy); border-radius: 20px; padding: 2rem;
  position: relative; overflow: hidden;
}
.faq-deco::before {
  content: '?'; position: absolute; right: -1rem; bottom: -2rem; font-size: 12rem; font-weight: 900;
  background: var(--grad); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  opacity: .08; line-height: 1; pointer-events: none;
}
.faq-deco-title { font-size: 1.5rem; font-weight: 800; color: white; margin-bottom: .5rem; }
.faq-deco-sub { font-size: .875rem; color: rgba(255, 255, 255, .45); line-height: 1.7; margin-bottom: 1.5rem; }
.faq-list { display: flex; flex-direction: column; gap: 0; }
.faq-item { border-bottom: 1px solid #f1f5f9; }
.faq-item.faq-open { border-bottom-color: rgba(16, 185, 129, .2); }
.faq-trigger {
  width: 100%; background: none; border: none; text-align: left;
  padding: 1.25rem 0; display: flex; justify-content: space-between; align-items: center; gap: 1rem;
  cursor: pointer; color: var(--navy); font-size: .95rem; font-weight: 600;
  transition: color .2s;
}
.faq-trigger:hover, .faq-item.faq-open .faq-trigger { color: var(--teal-g); }
.faq-chevron {
  width: 28px; height: 28px; border-radius: 50%; background: rgba(16, 185, 129, .1); color: var(--teal);
  display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 400;
  flex-shrink: 0; transition: transform .3s, background .2s;
}
.faq-chevron.rotate { transform: rotate(45deg); background: var(--teal); color: white; }
.faq-body { overflow: hidden; max-height: 0; transition: max-height .35s cubic-bezier(.4, 0, .2, 1); }
.faq-body.faq-body-open { max-height: 300px; }
.faq-body p { color: #64748b; font-size: .875rem; line-height: 1.8; padding-bottom: 1.25rem; }

/* ═══ CTA ═══ */
.cta-section { padding: 6rem clamp(1.5rem, 6vw, 5rem); position: relative; z-index: 1; }
.cta-inner {
  background: var(--navy); border-radius: 28px; padding: 5rem 3rem; text-align: center;
  position: relative; overflow: hidden;
  box-shadow: 0 40px 100px rgba(15, 23, 42, .4);
}
.cta-inner::before {
  content: ''; position: absolute; inset: 0;
  background: radial-gradient(ellipse 70% 90% at 50% 50%, rgba(16, 185, 129, .12), transparent);
  pointer-events: none;
}
.cta-glow {
  position: absolute; top: -100px; left: 50%; transform: translateX(-50%);
  width: 500px; height: 300px;
  background: radial-gradient(ellipse, rgba(16, 185, 129, .25), transparent 70%);
  pointer-events: none;
}
.cta-h2 {
  font-size: clamp(2.5rem, 5vw, 4rem); font-weight: 900; color: white;
  letter-spacing: -.03em; margin-bottom: 1rem; line-height: 1.1; position: relative;
}
.cta-sub { 
  color: rgba(255, 255, 255, .5); font-size: 1rem; max-width: 480px; 
  margin: 0 auto 2.5rem; line-height: 1.75; position: relative; 
}
.btn-cta {
  background: var(--grad); color: white; border: none;
  padding: 16px 48px; border-radius: 14px;
  font-size: 16px; font-weight: 700; letter-spacing: .04em;
  cursor: pointer; position: relative; overflow: hidden;
  box-shadow: 0 8px 40px rgba(16, 185, 129, .45);
  transition: transform .2s, box-shadow .2s;
  text-decoration: none; display: inline-block;
}
.btn-cta::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, .18), transparent);
  pointer-events: none;
}
.btn-cta:hover { transform: translateY(-3px) scale(1.03); box-shadow: 0 16px 60px rgba(16, 185, 129, .55); }

/* Hex Badges & Stat Cards */
.hex-row { display: flex; gap: 1rem; flex-wrap: wrap; }
.hex-badge {
  display: flex; align-items: center; gap: .5rem;
  background: rgba(16, 185, 129, .08); border: 1px solid rgba(16, 185, 129, .2); 
  border-radius: 12px; padding: .5rem 1rem; font-size: .8rem; 
  font-weight: 600; color: var(--teal-g);
}
.hex-icon { font-size: 1rem; }
.stat-card {
  background: white; border-radius: 16px; padding: 1.25rem 1.5rem;
  border: 1px solid rgba(16, 185, 129, .15);
  box-shadow: 0 8px 32px rgba(15, 23, 42, .08);
  position: relative; overflow: hidden;
}
.stat-card-accent { position: absolute; top: 0; left: 0; right: 0; height: 3px; }
.stat-card-num { 
  font-size: 2rem; font-weight: 900; letter-spacing: -.02em; 
  line-height: 1; margin-bottom: .25rem; margin-top: .5rem; 
}
.stat-card-label { 
  font-size: .8rem; font-weight: 600; color: #94a3b8; 
  text-transform: uppercase; letter-spacing: .06em; 
}
.float-card { animation: floatcard 5s ease-in-out infinite; }
@keyframes floatcard { 
  0%, 100% { transform: translateY(0) } 
  50% { transform: translateY(-8px) } 
}

/* ═══ RESPONSIVE ═══ */
@media(max-width: 1200px) {
  .hero-dashboard { max-width: 360px; }
}
@media(max-width: 1024px) {
  .hero-section { grid-template-columns: 1fr; min-height: auto; padding-top: 4rem; }
  .hero-right { display: none; }
  .feat-grid { grid-template-columns: 1fr 1fr; }
  .process-grid { grid-template-columns: 1fr; }
  .process-grid::before { display: none; }
  .stats-grid { grid-template-columns: 1fr 1fr; gap: 2rem; }
  .stat-divider { display: none; }
  .testi-grid { grid-template-columns: 1fr; }
  .faq-layout { grid-template-columns: 1fr; }
  .faq-sticky { position: static; }
  .faq-deco { margin-top: 2rem; }
}
@media(max-width: 768px) {
  .hero-sub { max-width: 100%; }
  .hero-cta-row { flex-direction: column; align-items: stretch; }
  .btn-hero-primary, .btn-hero-ghost { justify-content: center; text-align: center; }
  .hero-trust { flex-wrap: wrap; gap: 1rem; }
  .features-head { flex-direction: column; align-items: flex-start; }
  .section-sub { max-width: 100%; }
  .stats-section { padding: 3rem clamp(1.5rem, 6vw, 5rem); }
  .stats-inner { padding: 3rem 2rem; }
  .stat-num { font-size: 2.5rem; }
  .process-section { padding: 4rem clamp(1.5rem, 6vw, 5rem); }
  .process-card { padding: 2rem 1.5rem; }
  .testi-section { padding: 4rem clamp(1.5rem, 6vw, 5rem); }
  .faq-section { padding: 4rem clamp(1.5rem, 6vw, 5rem); }
  .cta-section { padding: 4rem clamp(1.5rem, 6vw, 5rem); }
  .cta-inner { padding: 3rem 1.5rem; }
  .btn-cta { padding: 14px 32px; font-size: 15px; }
  .features-section { padding: 4rem clamp(1.5rem, 6vw, 5rem); }
  .feat-card { padding: 2rem 1.5rem; }
  .float-pill { display: none; }
  .marquee-item { font-size: 11px; }
}
@media(max-width: 640px) {
  .feat-grid { grid-template-columns: 1fr; }
  .hero-h1 { font-size: 2.5rem; }
  .stats-inner { padding: 2.5rem 1.5rem; }
  .stats-grid { gap: 2rem 1rem; }
  .stat-num { font-size: 2.2rem; }
  .stat-card-num { font-size: 1.6rem; }
  .hero-section { padding: 3rem 1rem 2rem; }
  .hero-eyebrow { font-size: 10px; padding: 4px 12px; }
  .hero-sub { font-size: .95rem; }
  .hex-row { gap: .5rem; }
  .hex-badge { font-size: .7rem; padding: .35rem .75rem; }
  .faq-deco-title { font-size: 1.2rem; }
  .faq-deco-sub { font-size: .8rem; }
  .btn-hero-primary, .btn-hero-ghost { padding: 12px 24px; font-size: 14px; }
  .trust-text { font-size: 12px; }
  .section-h2 { font-size: 1.8rem; }
  .slogan-item { font-size: 1rem; }
  .process-step-num { width: 48px; height: 48px; font-size: 1rem; }
}
@media(max-width: 480px) {
  .hero-h1 { font-size: 2rem; }
  .stats-grid { grid-template-columns: 1fr 1fr; gap: 1.5rem .5rem; }
  .stat-num { font-size: 1.8rem; }
  .stat-label { font-size: 10px; }
  .stats-inner { padding: 2rem 1rem; }
  .feat-card { padding: 1.5rem 1rem; }
  .process-card { padding: 1.5rem 1rem; }
  .cta-h2 { font-size: 1.8rem; }
  .cta-sub { font-size: .9rem; }
  .testi-card { padding: 1.5rem; }
  .marquee-band { padding: .6rem 0; }
  .marquee-item { font-size: 10px; gap: .4rem; }
  .hero-cta-row { gap: .75rem; }
  .hero-trust { justify-content: center; }
  .hex-row { justify-content: center; }
};
`