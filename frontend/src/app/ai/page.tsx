"use client";

import { useState, useEffect } from "react";
import { useLocale } from "@/i18n/LocaleContext";
import { aiAPI, paymentAPI } from "@/lib/api";
import { fDZD } from "@/lib/format";
import { isLoggedIn, logout } from "@/lib/auth";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────
interface MealItem {
  name: string;
  amount: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

interface Meal {
  id: string;
  name: string;
  time: string;
  icon: string;
  calories: number;
  items: MealItem[];
  preparation?: string;
  notes?: string;
}

interface Macros {
  protein: number;
  carbs: number;
  fat: number;
}

interface WorkoutExercise {
  exercise: string;
  sets: string;
  reps: string;
  notes?: string;
}

interface WorkoutDay {
  day: string;
  focus: string;
  warmUp: WorkoutExercise[];
  exercises: WorkoutExercise[];
  coolDown: WorkoutExercise[];
  tips: string[];
}

interface WorkoutPlan {
  goal: string;
  daysPerWeek: number;
  days: WorkoutDay[];
  generalTips: string[];
}

interface ShoppingCategory {
  category: string;
  items: { name: string; quantity: string; estimatedCostDZD: number }[];
}

interface Plan {
  calories: number;
  macros: Macros;
  meals: Meal[];
  tips: string[];
  workout?: WorkoutPlan;
  tdee: number;
  calorieTarget: number;
  shoppingList?: ShoppingCategory[];
  weeklyBudgetEstimateDZD?: number;
  calorieDrift?: number;
  profile: {
    age: number;
    weight: number;
    height: number;
    gender: string;
    goal: string;
    activityLevel: string;
    fitnessLevel: string;
    days: number;
    workoutPlace: string;
    budget: string;
    dietaryPreference: string;
  };
}

// ─── Macro Bar ────────────────────────────────────────────────────────────────
function MacroBar({ label, value, unit, color, percent }: {
  label: string; value: number; unit: string; color: string; percent: number;
}) {
  return (
    <div className="flex-1 min-w-0 group">
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
        <span className="text-sm font-black text-white">{value}<span className="text-xs text-slate-500 ml-1 font-medium">{unit}</span></span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(255,255,255,0.2)] ${color}`}
          style={{ width: `${Math.max(2, Math.min(percent, 100))}%` }}
        />
      </div>
    </div>
  );
}

// ─── Meal Card ────────────────────────────────────────────────────────────────
function MealCard({ meal, index }: { meal: Meal; index: number }) {
  const [open, setOpen] = useState(false);
  const { t } = useLocale();

  return (
    <div
      className="glass rounded-2xl overflow-hidden border border-white/10 hover:border-emerald-500/30 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(16,185,129,0.1)] group"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 p-5 text-left bg-gradient-to-r from-transparent hover:from-white/5 transition-all"
      >
        <div className="relative shrink-0">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white/10 to-transparent border border-white/20 flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform duration-300">
            {meal.icon}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-white text-base md:text-lg truncate">{meal.name}</h3>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
              {meal.time}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            {meal.items.length} {t("ai.items")}
          </p>
        </div>

        <div className="text-right shrink-0 px-2">
          <span className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">{meal.calories}</span>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t("ai.kcal")}</p>
        </div>

        <div className={`w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 transition-transform duration-500 ${open ? "rotate-180 bg-emerald-500/20 text-emerald-400" : "text-slate-400"}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      <div className={`grid transition-all duration-300 ease-in-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <div className="border-t border-white/5 px-5 pb-5 pt-4 space-y-3 bg-black/20">
            {meal.items.map((item, i) => (
              <div key={i} className="flex items-center gap-3 group/item hover:bg-white/5 p-2 -mx-2 rounded-xl transition-colors">
                <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-slate-200 font-semibold">{item.name}</span>
                  {(item.protein !== undefined || item.carbs !== undefined || item.fat !== undefined) && (
                    <span className="block sm:inline sm:ml-2 text-[10px] text-slate-500 font-medium">
                      <span className="text-blue-400">P {item.protein || 0}g</span> <span className="mx-1 opacity-50">·</span> 
                      <span className="text-amber-400">C {item.carbs || 0}g</span> <span className="mx-1 opacity-50">·</span> 
                      <span className="text-rose-400">F {item.fat || 0}g</span>
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-300 font-medium bg-white/5 px-2.5 py-1 rounded-md border border-white/10">
                  {item.amount}
                </span>
                <span className="text-xs font-bold text-slate-400 w-16 text-right group-hover/item:text-emerald-400 transition-colors">
                  {item.calories} <span className="text-[9px]">kcal</span>
                </span>
              </div>
            ))}

            {meal.preparation && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-sky-500/10 to-transparent border border-sky-500/20 mt-4">
                <span className="text-lg shrink-0">👨‍🍳</span>
                <p className="text-xs text-sky-200 leading-relaxed font-medium">{meal.preparation}</p>
              </div>
            )}

            {meal.notes && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20">
                <span className="text-lg shrink-0">💡</span>
                <p className="text-xs text-amber-200/90 leading-relaxed font-medium">{meal.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Calorie Ring ─────────────────────────────────────────────────────────────
function CalorieRing({ calories }: { calories: number }) {
  const { t } = useLocale();
  const max = 3500;
  const pct = Math.min(calories / max, 1);
  const r = 56;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;

  return (
    <div className="relative inline-flex items-center justify-center p-4">
      <svg width="160" height="160" className="-rotate-90 filter drop-shadow-[0_0_12px_rgba(16,185,129,0.3)]">
        <circle cx="80" cy="80" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
        <circle
          cx="80" cy="80" r={r} fill="none"
          stroke="url(#ring-gradient)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          className="transition-all duration-1500 ease-out"
        />
        <defs>
          <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute text-center flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400 leading-none tracking-tight">{calories}</span>
        <p className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest mt-1">{t("ai.kcalDay")}</p>
      </div>
    </div>
  );
}

// ─── Exercise Row ─────────────────────────────────────────────────────────────
const muscleColors: Record<string, string> = {
  chest: "border-red-500/30 bg-red-500/10 text-red-400",
  back: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  legs: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  shoulders: "border-purple-500/30 bg-purple-500/10 text-purple-400",
  arms: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  core: "border-rose-500/30 bg-rose-500/10 text-rose-400",
  glutes: "border-pink-500/30 bg-pink-500/10 text-pink-400",
};

function getMuscleColor(focus: string): string {
  const lower = focus.toLowerCase();
  for (const [key, color] of Object.entries(muscleColors)) {
    if (lower.includes(key)) return color;
  }
  return "border-slate-500/30 bg-slate-500/10 text-slate-400";
}

const muscleEmojis: Record<string, string> = {
  chest: "🏋️", back: "🔥", legs: "🦵", shoulders: "💪", arms: "💪",
  biceps: "💪", triceps: "💪", core: "🌀", glutes: "🍑", full: "⚡", cardio: "🏃",
};

function getMuscleEmoji(focus: string): string {
  const lower = focus.toLowerCase();
  for (const [key, emoji] of Object.entries(muscleEmojis)) {
    if (lower.includes(key)) return emoji;
  }
  return "🏋️";
}

function ExerciseRow({ ex, color }: { ex: WorkoutExercise; color: string }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${color} hover:brightness-110 transition-all`}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white">{ex.exercise}</p>
        {ex.notes && <p className="text-[11px] text-slate-400 mt-1 font-medium">{ex.notes}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0 bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
        <span className="text-xs font-black text-white">{ex.sets}</span>
        <span className="text-[10px] text-slate-500 font-bold uppercase">Sets</span>
        <span className="text-slate-600 px-1">×</span>
        <span className="text-xs font-black text-white">{ex.reps}</span>
        <span className="text-[10px] text-slate-500 font-bold uppercase">Reps</span>
      </div>
    </div>
  );
}

// ─── Workout Day Card ─────────────────────────────────────────────────────────
function WorkoutDayCard({ day, index }: { day: WorkoutDay; index: number }) {
  const [open, setOpen] = useState(false);
  const { t } = useLocale();
  const color = getMuscleColor(day.focus);
  const emoji = getMuscleEmoji(day.focus);

  return (
    <div
      className="glass rounded-2xl overflow-hidden border border-white/10 hover:border-white/30 transition-all duration-300 group"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 p-5 text-left bg-gradient-to-r from-transparent hover:from-white/5 transition-all"
      >
        <div className="relative shrink-0">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border shadow-inner group-hover:scale-110 transition-transform duration-300 ${color}`}>
            {emoji}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-white text-base md:text-lg">{day.day}</h3>
            <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border shadow-sm ${color}`}>
              {day.focus}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            {day.exercises.length} {t("ai.exercise").toLowerCase()}s
          </p>
        </div>

        <div className={`w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 transition-transform duration-500 ${open ? "rotate-180 bg-white/10 text-white" : "text-slate-400"}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      <div className={`grid transition-all duration-300 ease-in-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <div className="border-t border-white/5 px-5 pb-6 pt-4 space-y-6 bg-black/20">
            {day.warmUp.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">🔥</span>
                  <h4 className="text-xs font-extrabold text-amber-400 uppercase tracking-widest">{t("ai.warmUp")}</h4>
                </div>
                <div className="space-y-2">
                  {day.warmUp.map((ex, i) => (
                    <ExerciseRow key={i} ex={ex} color="border-amber-500/20 bg-amber-500/5 text-amber-400" />
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">💪</span>
                <h4 className="text-xs font-extrabold text-white uppercase tracking-widest">{t("ai.exercise")}s</h4>
              </div>
              <div className="space-y-2">
                {day.exercises.map((ex, i) => (
                  <ExerciseRow key={i} ex={ex} color={color} />
                ))}
              </div>
            </div>

            {day.coolDown.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">🧘</span>
                  <h4 className="text-xs font-extrabold text-sky-400 uppercase tracking-widest">{t("ai.coolDown")}</h4>
                </div>
                <div className="space-y-2">
                  {day.coolDown.map((ex, i) => (
                    <ExerciseRow key={i} ex={ex} color="border-sky-500/20 bg-sky-500/5 text-sky-400" />
                  ))}
                </div>
              </div>
            )}

            {day.tips.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-white/5">
                {day.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-sm shrink-0 mt-0.5">💡</span>
                    <p className="text-xs text-slate-300 leading-relaxed font-medium">{tip}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Section Divider ──────────────────────────────────────────────────────
function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4 mb-8 mt-4 relative">
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div className="w-full border-t border-dashed border-white/10"></div>
      </div>
      <div className="relative flex justify-center w-full">
        <span className="bg-slate-900 px-4 text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] border border-white/10 rounded-full py-1 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
          {label}
        </span>
      </div>
    </div>
  );
}

// ─── Pill Group ───────────────────────────────────────────────────────────
function PillGroup({ options, value, onChange }: {
  options: { value: string; label: string; icon?: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {options.map((o) => {
        const isActive = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`flex items-center gap-2 touch-manipulation font-bold transition-all duration-200 rounded-xl px-4 py-3 text-sm active:scale-95 ${
              isActive
                ? "bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-400/50 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                : "bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white hover:border-white/20"
            }`}
          >
            {o.icon && <span>{o.icon}</span>}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────
function MetricCard({ icon, label, value, sub }: {
  icon: string; label: string; value: string; sub?: string;
}) {
  return (
    <div className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 flex-1 min-w-0 shadow-lg hover:border-white/20 transition-all">
      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-2xl border border-white/10 shrink-0 shadow-inner">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">{label}</p>
        <p className="text-xl font-black text-white truncate">{value}</p>
        {sub && <p className="text-[10px] text-emerald-400 font-bold mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────
export default function AIAssistant() {
  const { t } = useLocale();
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [gender, setGender] = useState("male");
  const [activityLevel, setActivityLevel] = useState("sedentary");
  const [fitnessLevel, setFitnessLevel] = useState("beginner");
  const [days, setDays] = useState(3);
  const [dietaryPreference, setDietaryPreference] = useState("none");
  const [budget, setBudget] = useState("mid");
  const [goal, setGoal] = useState("lose");
  const [workoutPlace, setWorkoutPlace] = useState<"home" | "gym">("gym");
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [planTitle, setPlanTitle] = useState("");
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [activeTab, setActiveTab] = useState<"nutrition" | "workout">("nutrition");

  // ── AI Usage Limit ────────────────────────────────────────────────────
  const [aiUsage, setAiUsage] = useState<{
    used: number; freeLimit: number; creditBalance: number;
    totalAllowance: number; remaining: number;
  } | null>(null);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [buyCredits, setBuyCredits] = useState(5);
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyError, setBuyError] = useState("");
  const [buySuccess, setBuySuccess] = useState("");
  const [creditPrice, setCreditPrice] = useState(500);

  useEffect(() => {
    if (isLoggedIn()) {
      paymentAPI.getAIUsage().then(setAiUsage).catch(() => {});
    }
    aiAPI.getConfig().then((cfg) => {
      if (cfg?.creditPrice) setCreditPrice(cfg.creditPrice);
    }).catch(() => {});
  }, []);

  const limitReached = aiUsage && aiUsage.remaining <= 0;

  const handleGenerate = async () => {
    if (!isLoggedIn()) {
      setError(t("ai.loginError"));
      return;
    }
    if (!age || !weight || !height) {
      setError(t("ai.fillError"));
      return;
    }
    setLoading(true);
    setError("");
    setPlan(null);

    try {
      const data = await aiAPI.generatePlan({
        age: Number(age), weight: Number(weight), height: Number(height),
        goal, workoutPlace, gender, activityLevel, fitnessLevel,
        days, dietaryPreference, budget,
      });
      setPlan(data.plan);
      setSavedId(null);
      setSaveError("");
      setPlanTitle("");
      setActiveTab("nutrition");
      paymentAPI.getAIUsage().then(setAiUsage).catch(() => {});
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.toLowerCase().includes("token") || msg.toLowerCase().includes("access denied")) {
        logout();
        return;
      }
      if (msg.toLowerCase().includes("limit reached") || msg.toLowerCase().includes("generation limit")) {
        setError(msg + " — Purchase more credits to continue.");
        paymentAPI.getAIUsage().then(setAiUsage).catch(() => {});
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlan = async () => {
    if (!plan || saving) return;
    setSaving(true);
    try {
      const data = await aiAPI.savePlan({
        title: planTitle || `Plan - ${new Date().toLocaleDateString()}`,
        calories: plan.calories,
        mealPlan: "",
        workoutPlan: "",
        workoutPlace: plan.profile.workoutPlace,
        data: plan,
      });
      setSavedId(data.plan.id);
      setPlanTitle("");
      setSaveError("");
    } catch (err: any) {
      setSaveError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleBuyCredits = async () => {
    setBuyLoading(true);
    setBuyError("");
    setBuySuccess("");
    try {
      const data = await paymentAPI.purchaseAICredits(buyCredits);
      setBuySuccess(`Purchased ${buyCredits} credit(s) for ${fDZD(data.totalPrice)}!`);
      setAiUsage((prev) => prev ? { ...prev, creditBalance: data.aiCreditBalance, remaining: data.remaining } : prev);
      setTimeout(() => setShowBuyModal(false), 2000);
    } catch (err: any) {
      setBuyError(err.message);
    } finally {
      setBuyLoading(false);
    }
  };

  // Static Data Arrays for UI
  const goals = [
    { value: "lose",     label: t("ai.loseWeight"), icon: "🔥", color: "from-rose-500/20 to-red-500/20 border-red-500/50 text-red-300" },
    { value: "maintain", label: t("ai.maintain"),   icon: "⚖️", color: "from-amber-500/20 to-orange-500/20 border-amber-500/50 text-amber-300" },
    { value: "gain",     label: t("ai.buildMuscle"),icon: "💪", color: "from-blue-500/20 to-cyan-500/20 border-blue-500/50 text-blue-300" },
  ];

  const activityLevels = [
    { value: "sedentary",   label: t("ai.sedentary") },
    { value: "light",       label: t("ai.light") },
    { value: "moderate",    label: t("ai.moderate") },
    { value: "active",      label: t("ai.active") },
    { value: "very_active", label: t("ai.veryActive") },
  ];

  const fitnessLevels = [
    { value: "beginner",     label: t("ai.beginner"), icon: "🌱" },
    { value: "intermediate", label: t("ai.intermediate"), icon: "⭐" },
    { value: "advanced",     label: t("ai.advanced"), icon: "👑" },
  ];

  const dayOptions = [2, 3, 4, 5, 6, 7].map((d) => ({
    value: String(d), label: `${d} ${t("ai.days_one")}`,
  }));

  const dietOptions = [
    { value: "none",        label: t("ai.none"), icon: "🥩" },
    { value: "vegan",       label: t("ai.vegan"), icon: "🥗" },
    { value: "vegetarian",  label: t("ai.vegetarian"), icon: "🥚" },
  ];

  const budgetOptions = [
    { value: "economy", label: t("ai.economy"), icon: "🪙" },
    { value: "mid",     label: t("ai.mid"), icon: "💵" },
    { value: "high",    label: t("ai.high"), icon: "💎" },
  ];

  return (
    <div className="max-w-5xl mx-auto pb-20 relative">
      
      {/* ── Background Glow ── */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-64 bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="glass p-8 sm:p-12 text-center mb-10 animate-fade-up rounded-[2rem] border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.3)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-500/20 to-transparent blur-[80px] -z-10 rounded-full mix-blend-screen" />
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-6 shadow-inner">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          {t("ai.badge")}
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 mb-6 tracking-tight leading-tight">
          {t("ai.title")}
        </h1>
        <p className="text-slate-400 max-w-xl mx-auto text-sm sm:text-base font-medium leading-relaxed">
          {t("ai.subtitle")}
        </p>
      </div>

      {/* ── Form Section ───────────────────────────────────────────────── */}
      <div className="glass p-6 sm:p-10 lg:p-12 mb-10 animate-fade-up rounded-[2.5rem] border border-white/10 shadow-xl relative">
        
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-md rounded-[2.5rem] flex flex-col items-center justify-center animate-in fade-in duration-300">
            <div className="relative w-24 h-24 mb-6">
              <div className="absolute inset-0 border-4 border-white/10 rounded-full" />
              <div className="absolute inset-0 border-4 border-emerald-400 rounded-full border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-3xl animate-pulse">🧠</div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2 tracking-tight">AI is crafting your perfect plan...</h3>
            <p className="text-sm text-emerald-400 font-medium animate-pulse">Analyzing biometrics & generating workouts</p>
          </div>
        )}

        {/* ── Personal Info ── */}
        <SectionDivider label={t("ai.personalInfo")} />

        <div className="grid md:grid-cols-3 gap-5 mb-8">
          {[
            { id: "ai-age", label: t("ai.age"), value: age, setter: setAge, placeholder: "e.g. 25", icon: "🎂" },
            { id: "ai-weight", label: t("ai.weight"), value: weight, setter: setWeight, placeholder: "e.g. 70", icon: "⚖️" },
            { id: "ai-height", label: t("ai.height"), value: height, setter: setHeight, placeholder: "e.g. 175", icon: "📏" },
          ].map(({ id, label, value, setter, placeholder, icon }) => (
            <div key={id} className="relative group">
              <label htmlFor={id} className="block text-[11px] font-extrabold text-slate-400 mb-2 uppercase tracking-widest pl-1">
                {label}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg grayscale group-focus-within:grayscale-0 transition-all">{icon}</span>
                <input
                  id={id} type="number" value={value} onChange={(e) => setter(e.target.value)} placeholder={placeholder}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-2xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all outline-none font-medium placeholder:text-slate-600 shadow-inner"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div>
            <label className="block text-[11px] font-extrabold text-slate-400 mb-3 uppercase tracking-widest pl-1">{t("ai.gender")}</label>
            <div className="flex gap-3">
              {[
                { value: "male", label: t("ai.male"), icon: "👨" },
                { value: "female", label: t("ai.female"), icon: "👩" },
              ].map((opt) => (
                <button
                  key={opt.value} type="button" onClick={() => setGender(opt.value)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                    gender === opt.value
                      ? "bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-400/50 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                      : "bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className={gender === opt.value ? "" : "grayscale opacity-70"}>{opt.icon}</span> {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-extrabold text-slate-400 mb-3 uppercase tracking-widest pl-1">{t("ai.dietaryPreference")}</label>
            <PillGroup options={dietOptions} value={dietaryPreference} onChange={setDietaryPreference} />
          </div>
        </div>

        {/* ── Fitness Details ── */}
        <SectionDivider label={t("ai.fitnessDetails")} />

        <div className="mb-8">
          <label className="block text-[11px] font-extrabold text-slate-400 mb-3 uppercase tracking-widest pl-1">{t("ai.activityLevel")}</label>
          <PillGroup options={activityLevels} value={activityLevel} onChange={setActivityLevel} />
        </div>

        <div className="mb-8">
          <label className="block text-[11px] font-extrabold text-slate-400 mb-3 uppercase tracking-widest pl-1">{t("ai.fitnessLevel")}</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {fitnessLevels.map((opt) => (
              <button
                key={opt.value} type="button" onClick={() => setFitnessLevel(opt.value)}
                className={`py-4 px-4 flex items-center justify-center gap-3 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                  fitnessLevel === opt.value
                    ? "bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-400/50 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                    : "bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="text-xl">{opt.icon}</span> {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Goal & Logistics ── */}
        <SectionDivider label={t("ai.goalSection")} />

        <div className="mb-8">
          <label className="block text-[11px] font-extrabold text-slate-400 mb-3 uppercase tracking-widest pl-1">{t("ai.yourGoal")}</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {goals.map((g) => (
              <button
                key={g.value} type="button" onClick={() => setGoal(g.value)}
                className={`p-4 rounded-xl text-sm font-bold flex flex-col items-center justify-center gap-2 transition-all active:scale-95 border ${
                  goal === g.value ? `bg-gradient-to-br ${g.color} shadow-lg` : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="text-2xl">{g.icon}</span>
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-10">
          <div>
            <label className="block text-[11px] font-extrabold text-slate-400 mb-3 uppercase tracking-widest pl-1">{t("ai.workoutDays")}</label>
            <PillGroup options={dayOptions} value={String(days)} onChange={(v) => setDays(Number(v))} />
          </div>
          <div>
            <label className="block text-[11px] font-extrabold text-slate-400 mb-3 uppercase tracking-widest pl-1">{t("ai.budget")}</label>
            <PillGroup options={budgetOptions} value={budget} onChange={setBudget} />
          </div>
        </div>

        <div className="mb-10">
          <label className="block text-[11px] font-extrabold text-slate-400 mb-3 uppercase tracking-widest pl-1">{t("ai.workoutPlace")}</label>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            {[
              { value: "home" as const, label: t("ai.home"), icon: "🏠" },
              { value: "gym" as const,  label: t("ai.gym"), icon: "🏢" },
            ].map((opt) => (
              <button
                key={opt.value} type="button" onClick={() => setWorkoutPlace(opt.value)}
                className={`py-4 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 border ${
                  workoutPlace === opt.value
                    ? "bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border-emerald-400/50 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                    : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className={workoutPlace === opt.value ? "" : "grayscale opacity-60"}>{opt.icon}</span> {opt.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium rounded-xl flex items-center gap-3 animate-fade-in">
            <span className="text-xl">⚠️</span>
            <span>
              {error}{" "}
              {(error.toLowerCase().includes("token") || error.toLowerCase().includes("access denied") || !isLoggedIn()) && (
                <Link href="/login" className="underline font-bold ml-1 hover:text-red-300">
                  {t("ai.goToLogin")}
                </Link>
              )}
            </span>
          </div>
        )}

        {/* Generate Button Area */}
        <div className="bg-black/20 -mx-6 sm:-mx-10 lg:-mx-12 -mb-6 sm:-mb-10 lg:-mb-12 p-6 sm:p-10 lg:p-12 rounded-b-[2.5rem] border-t border-white/5 mt-8 text-center flex flex-col items-center">
          {aiUsage && !limitReached && (
            <div className="mb-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-slate-300 font-bold tracking-wide">
                {aiUsage.remaining} Generations Remaining
                {aiUsage.creditBalance > 0 && <span className="text-emerald-400 ml-1">({aiUsage.creditBalance} Premium)</span>}
              </span>
            </div>
          )}

          {limitReached ? (
            <div className="w-full max-w-md space-y-4">
              <div className="p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 text-amber-300 text-sm font-bold rounded-xl shadow-inner">
                ⚠️ You've used all free generations.
              </div>
              <button onClick={() => setShowBuyModal(true)} className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-black font-black text-lg shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all">
                🪙 Buy Premium Credits
              </button>
            </div>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="group relative w-full max-w-md py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-black text-lg shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all overflow-hidden disabled:opacity-50 disabled:pointer-events-none"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              <span className="relative flex items-center justify-center gap-3">
                ✨ {t("ai.generatePlan")}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* ── Generated Result ───────────────────────────────────────────── */}
      {plan && (
        <div className="space-y-6 animate-fade-up scroll-mt-24" id="plan-results">
          
          {/* Tabs */}
          <div className="glass p-2 rounded-2xl flex gap-2 border border-white/10 max-w-md mx-auto shadow-lg relative z-10">
            {[
              { key: "nutrition" as const, label: t("ai.nutritionTab"), icon: "🥗" },
              { key: "workout" as const,  label: t("ai.workoutTab"), icon: "💪" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-3.5 px-4 rounded-xl text-sm font-extrabold transition-all flex items-center justify-center gap-2 ${
                  activeTab === tab.key
                    ? "bg-white/10 text-white shadow-md border border-white/10"
                    : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                }`}
              >
                <span>{tab.icon}</span> {tab.label}
              </button>
            ))}
          </div>

          {/* Nutrition View */}
          {activeTab === "nutrition" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="glass p-6 sm:p-8 lg:p-10 border border-emerald-500/30 rounded-[2rem] shadow-[0_10px_40px_rgba(16,185,129,0.1)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />
                
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-2xl shadow-lg">✅</div>
                  <div>
                    <h2 className="text-2xl font-black text-white tracking-tight">{t("ai.yourPlan")}</h2>
                    <p className="text-sm text-emerald-400 font-semibold">{t("ai.aiCrafted")}</p>
                  </div>
                </div>

                {/* Macro/Calorie Visualizer */}
                <div className="flex flex-col md:flex-row items-center gap-10 p-6 rounded-3xl bg-black/20 border border-white/5 mb-8">
                  <div className="shrink-0">
                    <CalorieRing calories={plan.calories} />
                  </div>
                  <div className="flex-1 w-full space-y-6">
                    {plan.macros && (
                      <>
                        <MacroBar label={t("ai.protein")} value={plan.macros.protein} unit="g" color="bg-gradient-to-r from-blue-400 to-cyan-400" percent={(plan.macros.protein / 200) * 100} />
                        <MacroBar label={t("ai.carbs")} value={plan.macros.carbs} unit="g" color="bg-gradient-to-r from-amber-400 to-orange-400" percent={(plan.macros.carbs / 350) * 100} />
                        <MacroBar label={t("ai.fat")} value={plan.macros.fat} unit="g" color="bg-gradient-to-r from-rose-400 to-pink-500" percent={(plan.macros.fat / 100) * 100} />
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                  <MetricCard icon="🔥" label={t("ai.tdee")} value={`${plan.tdee} kcal`} />
                  <MetricCard icon="🎯" label={t("ai.calorieTarget")} value={`${plan.calorieTarget} kcal`} sub={goal === "lose" ? "Deficit zone" : goal === "gain" ? "Surplus zone" : "Maintenance"} />
                  {plan.weeklyBudgetEstimateDZD && <MetricCard icon="💰" label="Est. Weekly Budget" value={fDZD(plan.weeklyBudgetEstimateDZD)} />}
                </div>

                {/* Save Toolbar */}
                <div className="flex flex-wrap items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl">
                  <input
                    type="text" value={planTitle} onChange={(e) => setPlanTitle(e.target.value)}
                    placeholder={t("ai.planName")}
                    className="flex-1 min-w-[200px] bg-black/30 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500/50 outline-none transition-all"
                  />
                  <button
                    onClick={handleSavePlan} disabled={saving}
                    className="px-6 py-2.5 rounded-xl bg-emerald-500 text-black font-bold text-sm hover:bg-emerald-400 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {saving ? "Saving..." : t("ai.savePlan")}
                  </button>
                  {savedId && (
                    <Link href="/dashboard/user" className="px-4 py-2.5 rounded-xl border border-emerald-500/50 text-emerald-400 font-bold text-sm hover:bg-emerald-500/10 transition-all">
                      View Dashboard ↗
                    </Link>
                  )}
                </div>
                {saveError && <p className="text-red-400 text-xs mt-2 font-medium px-2">⚠️ {saveError}</p>}
                {savedId && <p className="text-emerald-400 text-xs mt-2 font-medium px-2">✅ Plan successfully saved!</p>}
              </div>

              {/* Meals List */}
              <div>
                <div className="flex items-center justify-between mb-5 px-2">
                  <h3 className="text-xl font-black text-white flex items-center gap-2"><span>🍽️</span> {t("ai.dailyMealSchedule")}</h3>
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">{plan.meals.length} Meals</span>
                </div>
                <div className="space-y-4">
                  {plan.meals.map((meal, i) => <MealCard key={meal.id} meal={meal} index={i} />)}
                </div>
              </div>

              {/* Tips & Shopping List */}
              <div className="grid lg:grid-cols-2 gap-6">
                {plan.tips && plan.tips.length > 0 && (
                  <div className="glass p-6 sm:p-8 rounded-[2rem] border border-amber-500/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[50px] rounded-full" />
                    <h3 className="text-lg font-black text-white mb-5 flex items-center gap-2"><span>💡</span> {t("ai.nutritionTips")}</h3>
                    <ul className="space-y-4 relative z-10">
                      {plan.tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-4 text-sm text-slate-300 font-medium bg-black/20 p-3 rounded-xl border border-white/5">
                          <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {plan.shoppingList && plan.shoppingList.length > 0 && (
                  <div className="glass p-6 sm:p-8 rounded-[2rem] border border-sky-500/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 blur-[50px] rounded-full" />
                    <h3 className="text-lg font-black text-white mb-5 flex items-center gap-2"><span>🛒</span> Shopping List</h3>
                    <div className="space-y-6 relative z-10 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {plan.shoppingList.map((cat, ci) => (
                        <div key={ci}>
                          <h4 className="text-xs font-black text-sky-400 uppercase tracking-widest mb-3 border-b border-white/5 pb-2">{cat.category}</h4>
                          <div className="space-y-2">
                            {cat.items.map((item, ii) => (
                              <div key={ii} className="flex items-center justify-between text-sm px-4 py-2.5 rounded-xl bg-black/30 border border-white/5 hover:border-sky-500/30 transition-colors">
                                <span className="text-slate-200 font-medium">{item.name}</span>
                                <div className="flex items-center gap-4 text-xs">
                                  <span className="text-slate-500 font-bold">{item.quantity}</span>
                                  {item.estimatedCostDZD > 0 && <span className="font-black text-sky-400 bg-sky-500/10 px-2 py-1 rounded-md">{fDZD(item.estimatedCostDZD)}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Workout View */}
          {activeTab === "workout" && plan.workout && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="glass p-6 sm:p-8 lg:p-10 border border-emerald-500/30 rounded-[2rem] shadow-[0_10px_40px_rgba(16,185,129,0.1)] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-64 h-64 bg-cyan-500/10 blur-[80px] rounded-full pointer-events-none" />
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-3xl shadow-lg">⚡</div>
                    <div>
                      <h2 className="text-2xl font-black text-white tracking-tight">{t("ai.workoutTab")}</h2>
                      <p className="text-sm text-cyan-400 font-semibold">{plan.workout.goal}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/5 border border-white/10 shrink-0">
                    <span className="text-2xl">📅</span>
                    <div>
                      <p className="text-2xl font-black text-white leading-none">{plan.workout.daysPerWeek}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{t("ai.daysPerWeek")}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4 px-2 mt-8">
                <h3 className="text-xl font-black text-white flex items-center gap-2"><span>🗓️</span> Training Split</h3>
              </div>

              <div className="space-y-4">
                {plan.workout.days.map((day, i) => <WorkoutDayCard key={i} day={day} index={i} />)}
              </div>

              {plan.workout.generalTips && plan.workout.generalTips.length > 0 && (
                <div className="glass p-6 sm:p-8 rounded-[2rem] border border-blue-500/20 mt-8 relative overflow-hidden">
                  <div className="absolute bottom-0 right-0 w-40 h-40 bg-blue-500/10 blur-[60px] rounded-full" />
                  <h3 className="text-lg font-black text-white mb-5 flex items-center gap-2 relative z-10"><span>🧠</span> Pro Tips</h3>
                  <ul className="space-y-3 relative z-10">
                    {plan.workout.generalTips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-4 text-sm text-slate-300 font-medium bg-black/20 p-4 rounded-xl border border-white/5">
                        <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══ Premium Credits Modal ══ */}
      {showBuyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setShowBuyModal(false)}>
          <div className="glass p-8 sm:p-10 rounded-[2.5rem] border border-white/20 max-w-md w-full shadow-[0_20px_60px_rgba(0,0,0,0.5)] relative overflow-hidden transform transition-all animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/20 blur-[60px] rounded-full pointer-events-none" />
            
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-3xl shadow-lg mb-6 mx-auto">🪙</div>
            <h3 className="text-2xl font-black text-white text-center mb-2">Refuel AI Credits</h3>
            <p className="text-sm text-slate-400 text-center font-medium mb-8">Each credit unlocks 1 full custom generation. <br/><span className="text-amber-400 font-bold">{fDZD(creditPrice)} / credit</span></p>

            <div className="grid grid-cols-4 gap-2 mb-8">
              {[1, 5, 10, 25].map((n) => (
                <button
                  key={n} onClick={() => setBuyCredits(n)}
                  className={`py-4 rounded-2xl text-lg font-black transition-all active:scale-95 border ${
                    buyCredits === n
                      ? "bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                      : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>

            <div className="bg-black/30 rounded-2xl p-6 text-center mb-8 border border-white/5">
              <div className="text-sm text-slate-400 font-bold uppercase tracking-widest mb-2">Total Total</div>
              <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400">
                {fDZD(buyCredits * creditPrice)}
              </div>
            </div>

            {buyError && <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold rounded-xl mb-6 text-center">{buyError}</div>}
            {buySuccess && <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold rounded-xl mb-6 text-center">{buySuccess}</div>}

            <div className="flex gap-3">
              <button onClick={() => setShowBuyModal(false)} className="flex-1 py-4 rounded-xl text-slate-400 font-bold hover:text-white hover:bg-white/5 transition-all">Cancel</button>
              <button onClick={handleBuyCredits} disabled={buyLoading}
                className="flex-[2] py-4 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-black font-black hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
              >
                {buyLoading ? "Processing..." : `Pay ${fDZD(buyCredits * creditPrice)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
