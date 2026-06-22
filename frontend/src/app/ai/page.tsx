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

interface ShoppingCategory {
  category: string;
  items: { name: string; quantity: string; estimatedCostDZD: number }[];
}

// ─── Macro Bar ────────────────────────────────────────────────────────────────
function MacroBar({ label, value, unit, color, percent }: {
  label: string; value: number; unit: string; color: string; percent: number;
}) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
        <span className="text-sm font-bold text-white">{value}<span className="text-xs text-slate-400 ml-0.5">{unit}</span></span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${color}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
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
      className="glass rounded-2xl overflow-hidden border border-white/5 hover:border-white/10 transition-all duration-300"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="relative shrink-0">
          <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-2xl">
            {meal.icon}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-bold text-white text-base">{meal.name}</h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {meal.time}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {meal.items.length} {t("ai.items")}
          </p>
        </div>

        <div className="text-right shrink-0">
          <span className="text-lg font-black text-emerald-400">{meal.calories}</span>
          <p className="text-[10px] text-slate-500 font-medium">{t("ai.kcal")}</p>
        </div>

        <svg
          className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-white/5 px-5 pb-5 pt-4 space-y-3">
          {meal.items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 group">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm text-slate-300 font-medium">{item.name}</span>
                {(item.protein !== undefined || item.carbs !== undefined || item.fat !== undefined) && (
                  <span className="text-[10px] text-slate-500 ml-2">
                    P {item.protein || 0}g · C {item.carbs || 0}g · F {item.fat || 0}g
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-500 bg-white/[0.03] px-2 py-0.5 rounded-md border border-white/5">
                {item.amount}
              </span>
              <span className="text-xs font-semibold text-slate-400 w-16 text-right">
                {item.calories} {t("ai.kcal")}
              </span>
            </div>
          ))}

          {meal.preparation && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-sky-500/5 border border-sky-500/15">
              <span className="text-sm shrink-0">📋</span>
              <p className="text-xs text-sky-300/80 leading-relaxed">{meal.preparation}</p>
            </div>
          )}

          {meal.notes && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
              <span className="text-sm shrink-0">💡</span>
              <p className="text-xs text-amber-300/80 leading-relaxed">{meal.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Calorie Ring ─────────────────────────────────────────────────────────────
function CalorieRing({ calories }: { calories: number }) {
  const { t } = useLocale();
  const max = 3500;
  const pct = Math.min(calories / max, 1);
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="140" height="140" className="-rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
        <circle
          cx="70" cy="70" r={r} fill="none"
          stroke="url(#ring-gradient)"
          strokeWidth="10"
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
      <div className="absolute text-center">
        <span className="text-2xl font-black text-white leading-none">{calories}</span>
        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{t("ai.kcalDay")}</p>
      </div>
    </div>
  );
}

// ─── Exercise Row ─────────────────────────────────────────────────────────────
const muscleColors: Record<string, string> = {
  chest: "border-red-500/30 bg-red-500/10 text-red-400",
  back: "border-green-500/30 bg-green-500/10 text-green-400",
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

function ExerciseRow({ ex, color }: { ex: WorkoutExercise; color: string }) {
  return (
    <div className={`flex items-center gap-3 p-2.5 rounded-xl border ${color}`}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{ex.exercise}</p>
        {ex.notes && <p className="text-[11px] text-slate-500 mt-0.5">{ex.notes}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs font-bold text-slate-300">{ex.sets}</span>
        <span className="text-[10px] text-slate-500">×</span>
        <span className="text-xs font-bold text-slate-300">{ex.reps}</span>
      </div>
    </div>
  );
}

const muscleEmojis: Record<string, string> = {
  chest: "🏋️",
  back: "🔥",
  legs: "🦵",
  shoulders: "💪",
  arms: "💪",
  biceps: "💪",
  triceps: "💪",
  core: "🌀",
  glutes: "🍑",
  full: "⚡",
  cardio: "🏃",
};

function getMuscleEmoji(focus: string): string {
  const lower = focus.toLowerCase();
  for (const [key, emoji] of Object.entries(muscleEmojis)) {
    if (lower.includes(key)) return emoji;
  }
  return "🏋️";
}

// ─── Workout Day Card ─────────────────────────────────────────────────────────
function WorkoutDayCard({ day, index }: { day: WorkoutDay; index: number }) {
  const [open, setOpen] = useState(false);
  const { t } = useLocale();
  const color = getMuscleColor(day.focus);
  const emoji = getMuscleEmoji(day.focus);

  return (
    <div
      className="glass rounded-2xl overflow-hidden border border-white/5 hover:border-white/10 transition-all duration-300"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="relative shrink-0">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl border ${color}`}>
            {emoji}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-bold text-white text-base">{day.day}</h3>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${color}`}>
              {day.focus}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {day.exercises.length} {t("ai.exercise").toLowerCase()}s
          </p>
        </div>

        <svg
          className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-white/5 px-5 pb-5 pt-4 space-y-5">
          {/* Warm-up */}
          {day.warmUp.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">🔥</span>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t("ai.warmUp")}</h4>
              </div>
              <div className="space-y-1.5">
                {day.warmUp.map((ex, i) => (
                  <ExerciseRow key={i} ex={ex} color="border-amber-500/20 bg-amber-500/5 text-amber-400" />
                ))}
              </div>
            </div>
          )}

          {/* Main exercises */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <span>💪</span> {t("ai.exercise")}s
            </h4>
            <div className="space-y-1.5">
              {day.exercises.map((ex, i) => (
                <ExerciseRow key={i} ex={ex} color={color} />
              ))}
            </div>
          </div>

          {/* Cool-down */}
          {day.coolDown.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">🧘</span>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t("ai.coolDown")}</h4>
              </div>
              <div className="space-y-1.5">
                {day.coolDown.map((ex, i) => (
                  <ExerciseRow key={i} ex={ex} color="border-sky-500/20 bg-sky-500/5 text-sky-400" />
                ))}
              </div>
            </div>
          )}

          {/* Day tips */}
          {day.tips.length > 0 && (
            <div className="space-y-1.5">
              {day.tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-xs shrink-0 mt-0.5">💡</span>
                  <p className="text-xs text-slate-400 leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Section Divider ──────────────────────────────────────────────────────
function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4 mb-6 mt-2">
      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest shrink-0">{label}</span>
      <div className="flex-1 h-px bg-white/[0.06]" />
    </div>
  );
}

// ─── Pill Group ───────────────────────────────────────────────────────────
function PillGroup({ options, value, onChange, size }: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  size?: "sm" | "md";
}) {
  const sm = size === "sm";
  return (
    <div className={`flex flex-wrap gap-2 ${sm ? "" : ""}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`touch-manipulation font-semibold transition-all rounded-xl border ${
            value === o.value
              ? "border-emerald-500 bg-emerald-500/15 text-emerald-300 shadow-lg shadow-emerald-500/10"
              : "border-white/5 bg-white/[0.02] text-slate-400 hover:border-white/10 hover:text-slate-300"
          } ${sm ? "px-3 py-2 text-xs" : "px-4 py-2.5 text-sm"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────
function MetricCard({ icon, label, value, sub }: {
  icon: string; label: string; value: string; sub?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-white/[0.03] border border-white/5 flex-1 min-w-0">
      <span className="text-xl shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-semibold">{label}</p>
        <p className="text-lg font-black text-white">{value}</p>
        {sub && <p className="text-[10px] text-slate-500">{sub}</p>}
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
      // Refresh usage count after generation
      paymentAPI.getAIUsage().then(setAiUsage).catch(() => {});
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.toLowerCase().includes("token") || msg.toLowerCase().includes("access denied")) {
        logout();
        return;
      }
      // Check if it's a 402 limit reached error
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
      setSaveError("");
    } catch (err: any) {
      setSaveError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // ── Buy Credits ──────────────────────────────────────────────────────
  const handleBuyCredits = async () => {
    setBuyLoading(true);
    setBuyError("");
    setBuySuccess("");
    try {
      const data = await paymentAPI.purchaseAICredits(buyCredits);
      setBuySuccess(`Purchased ${buyCredits} credit(s) for ${fDZD(data.totalPrice)}!`);
      setAiUsage((prev) => prev ? { ...prev, creditBalance: data.aiCreditBalance, remaining: data.remaining } : prev);
      setShowBuyModal(false);
    } catch (err: any) {
      setBuyError(err.message);
    } finally {
      setBuyLoading(false);
    }
  };

  const goals = [
    { value: "lose",     label: t("ai.loseWeight"),   color: "border-red-500 bg-red-500/10 text-red-400" },
    { value: "maintain", label: t("ai.maintain"),       color: "border-amber-500 bg-amber-500/10 text-amber-400" },
    { value: "gain",     label: t("ai.buildMuscle"),   color: "border-blue-500 bg-blue-500/10 text-blue-400" },
  ];

  const activityLevels = [
    { value: "sedentary",   label: t("ai.sedentary") },
    { value: "light",       label: t("ai.light") },
    { value: "moderate",    label: t("ai.moderate") },
    { value: "active",      label: t("ai.active") },
    { value: "very_active", label: t("ai.veryActive") },
  ];

  const fitnessLevels = [
    { value: "beginner",     label: t("ai.beginner") },
    { value: "intermediate", label: t("ai.intermediate") },
    { value: "advanced",     label: t("ai.advanced") },
  ];

  const dayOptions = [2, 3, 4, 5, 6, 7].map((d) => ({
    value: String(d),
    label: `${d} ${t("ai.days_one")}`,
  }));

  const dietOptions = [
    { value: "none",        label: t("ai.none") },
    { value: "vegan",       label: t("ai.vegan") },
    { value: "vegetarian",  label: t("ai.vegetarian") },
  ];

  const budgetOptions = [
    { value: "economy", label: t("ai.economy") },
    { value: "mid",     label: t("ai.mid") },
    { value: "high",    label: t("ai.high") },
  ];

  return (
    <div className="max-w-4xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="text-center mb-12 animate-fade-up">
        <div className="badge badge-emerald mb-4">
          <span className="mr-1.5">🧠</span> {t("ai.badge")}
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold gradient-text mb-4 break-words">{t("ai.title")}</h1>
        <p className="text-slate-400 max-w-lg mx-auto">
          {t("ai.subtitle")}
        </p>
      </div>

      {/* ── Form ───────────────────────────────────────────────────────── */}
      <div className="glass p-8 lg:p-10 mb-8 animate-fade-up-d1">

        {/* ─── Personal Info ──────────────────────────────────────────── */}
        <SectionDivider label={t("ai.personalInfo")} />

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          {[
            { id: "ai-age", label: t("ai.age"), value: age, setter: setAge, placeholder: "25", autoComplete: "age" },
            { id: "ai-weight", label: t("ai.weight"), value: weight, setter: setWeight, placeholder: "70", autoComplete: "weight" },
            { id: "ai-height", label: t("ai.height"), value: height, setter: setHeight, placeholder: "175", autoComplete: "height" },
          ].map(({ id, label, value, setter, placeholder, autoComplete }) => (
            <div key={id}>
              <label htmlFor={id} className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                {label}
              </label>
              <input
                id={id}
                name={id}
                type="number"
                value={value}
                onChange={(e) => setter(e.target.value)}
                className="input-field"
                placeholder={placeholder}
                autoComplete={autoComplete}
              />
            </div>
          ))}
        </div>

        {/* Gender + Dietary Preference (side by side) */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">{t("ai.gender")}</label>
            <div className="flex gap-2">
              {[
                { value: "male",   label: t("ai.male") },
                { value: "female", label: t("ai.female") },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setGender(opt.value)}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all border touch-manipulation ${
                    gender === opt.value
                      ? "border-emerald-500 bg-emerald-500/15 text-emerald-300 shadow-lg shadow-emerald-500/10"
                      : "border-white/5 bg-white/[0.02] text-slate-400 hover:border-white/10"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">{t("ai.dietaryPreference")}</label>
            <PillGroup options={dietOptions} value={dietaryPreference} onChange={setDietaryPreference} />
          </div>
        </div>

        {/* ─── Fitness Profile ─────────────────────────────────────────── */}
        <SectionDivider label={t("ai.fitnessDetails")} />

        <div className="mb-6">
          <label className="block text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">{t("ai.activityLevel")}</label>
          <PillGroup options={activityLevels} value={activityLevel} onChange={setActivityLevel} />
        </div>

        <div className="mb-6">
          <label className="block text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">{t("ai.fitnessLevel")}</label>
          <div className="grid grid-cols-3 gap-3">
            {fitnessLevels.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFitnessLevel(opt.value)}
                className={`py-3 rounded-xl text-sm font-semibold transition-all border touch-manipulation ${
                  fitnessLevel === opt.value
                    ? "border-emerald-500 bg-emerald-500/15 text-emerald-300 shadow-lg shadow-emerald-500/10"
                    : "border-white/5 bg-white/[0.02] text-slate-400 hover:border-white/10"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ─── Goal & Plan ─────────────────────────────────────────────── */}
        <SectionDivider label={t("ai.goalSection")} />

        <div className="mb-6">
          <label className="block text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">{t("ai.yourGoal")}</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {goals.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => setGoal(g.value)}
                className={`p-4 rounded-xl text-sm font-semibold transition-all border touch-manipulation ${
                  goal === g.value
                    ? g.color
                    : "border-white/5 bg-white/[0.02] text-slate-400 hover:border-white/10"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">{t("ai.workoutDays")}</label>
          <div className="flex flex-wrap gap-2">
            {dayOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDays(Number(opt.value))}
                className={`touch-manipulation font-semibold transition-all rounded-xl border min-w-[80px] py-3 text-sm ${
                  days === Number(opt.value)
                    ? "border-emerald-500 bg-emerald-500/15 text-emerald-300 shadow-lg shadow-emerald-500/10"
                    : "border-white/5 bg-white/[0.02] text-slate-400 hover:border-white/10"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">{t("ai.budget")}</label>
          <PillGroup options={budgetOptions} value={budget} onChange={setBudget} />
        </div>

        <div className="mb-8">
          <label className="block text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">{t("ai.workoutPlace")}</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: "home" as const, label: t("ai.home"),  color: "border-emerald-500 bg-emerald-500/10 text-emerald-400" },
              { value: "gym" as const,  label: t("ai.gym"),   color: "border-emerald-500 bg-emerald-500/10 text-emerald-400" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setWorkoutPlace(opt.value)}
                className={`p-4 rounded-xl text-sm font-semibold transition-all border ${
                  workoutPlace === opt.value
                    ? opt.color
                    : "border-white/5 bg-white/[0.02] text-slate-400 hover:border-white/10"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 glass-sm border border-red-500/20 text-red-400 text-sm rounded-lg flex items-center gap-2">
            <span>⚠️</span>
            <span>
              {error}{" "}
              {(error.toLowerCase().includes("token") || error.toLowerCase().includes("access denied") || !isLoggedIn()) && (
                <Link href="/login" className="underline font-semibold ml-1">
                  {t("ai.goToLogin")}
                </Link>
              )}
            </span>
          </div>
        )}

        {/* Usage remaining indicator */}
        {aiUsage && !limitReached && (
          <div className="mb-4 text-center">
            <span className="text-xs text-slate-500 font-medium">
              {aiUsage.remaining} of {aiUsage.freeLimit + aiUsage.creditBalance} generations remaining
              {aiUsage.creditBalance > 0 && ` (${aiUsage.creditBalance} purchased)`}
            </span>
          </div>
        )}

        {limitReached ? (
          <div className="space-y-3">
            <div className="p-4 glass-sm border border-amber-500/20 text-amber-400 text-sm rounded-lg text-center">
              ⚠️ You've used all {aiUsage?.freeLimit || 3} free generations.
            </div>
            <button
              onClick={() => setShowBuyModal(true)}
              className="btn-primary w-full text-lg"
            >
              🪙 Buy More Credits
            </button>
          </div>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="btn-primary w-full text-lg disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t("ai.generating")}
              </span>
            ) : (
              t("ai.generatePlan")
            )}
          </button>
        )}
      </div>

      {/* ── Result ─────────────────────────────────────────────────────── */}
      {plan && (
        <div className="space-y-6 animate-fade-up">

          {/* ── Tab Switcher ──────────────────────────────────────────── */}
          <div className="glass p-1.5 rounded-2xl flex gap-1 border border-white/5">
            {[
              { key: "nutrition" as const, label: t("ai.nutritionTab") },
              { key: "workout" as const,  label: t("ai.workoutTab") },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
                  activeTab === tab.key
                    ? "bg-emerald-500/20 text-emerald-300 shadow-lg"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.03]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Nutrition Tab ─────────────────────────────────────────── */}
          {activeTab === "nutrition" && (
            <div className="space-y-6">
              <div className="glass p-6 lg:p-8 border border-emerald-500/20 rounded-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center text-lg">✅</div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{t("ai.yourPlan")}</h2>
                    <p className="text-xs text-slate-400">{t("ai.aiCrafted")}</p>
                  </div>
                </div>

                {/* Profile summary */}
                <div className="flex flex-wrap items-center gap-2 mb-6 pb-5 border-b border-white/5">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    {t("ai.personalInfo")}:
                  </span>
                  <span className="text-xs font-medium text-slate-300 bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/5">
                    {plan.profile.gender === "male" ? t("ai.male") : t("ai.female")}
                  </span>
                  <span className="text-xs text-slate-600">·</span>
                  <span className="text-xs font-medium text-slate-300">{plan.profile.age}y</span>
                  <span className="text-xs text-slate-600">·</span>
                  <span className="text-xs font-medium text-slate-300">{plan.profile.weight}kg</span>
                  <span className="text-xs text-slate-600">·</span>
                  <span className="text-xs font-medium text-slate-300">{plan.profile.height}cm</span>
                  <span className="text-xs text-slate-600">·</span>
                  {plan.profile.activityLevel && (
                    <>
                      <span className="text-xs font-medium text-slate-300">
                        {activityLevels.find((a) => a.value === plan.profile.activityLevel)?.label ?? plan.profile.activityLevel}
                      </span>
                      <span className="text-xs text-slate-600">·</span>
                    </>
                  )}
                  <span className="text-xs font-medium text-slate-300">{plan.profile.days}x/{t("ai.days_one")}</span>
                </div>

                {/* TDEE + CalorieTarget metric cards */}
                <div className="flex flex-wrap gap-3 mb-6">
                  <MetricCard
                    icon="🔥"
                    label={t("ai.tdee")}
                    value={`${plan.tdee} ${t("ai.kcal")}`}
                  />
                  <MetricCard
                    icon="🎯"
                    label={t("ai.calorieTarget")}
                    value={`${plan.calorieTarget} ${t("ai.kcal")}`}
                    sub={goal === "lose" ? "-20% deficit" : goal === "gain" ? "+15% surplus" : "maintenance"}
                  />
                  {plan.weeklyBudgetEstimateDZD && (
                    <MetricCard
                      icon="💰"
                      label="Budget / semaine"
                      value={fDZD(plan.weeklyBudgetEstimateDZD)}
                    />
                  )}
                </div>

                {/* Calorie drift warning */}
                {plan.calorieDrift && plan.calorieDrift > 0 && (
                  <div className="mb-6 p-3 glass-sm border border-amber-500/20 text-amber-400 text-xs rounded-lg flex items-center gap-2">
                    <span>⚠️</span>
                    <span>Calorie drift: ~{plan.calorieDrift} kcal from target. Meal adjustments recommended.</span>
                  </div>
                )}

                {/* Save Plan */}
                <div className="mb-6">
                  {saveError && (
                    <div className="mb-3 p-2.5 glass-sm border border-red-500/20 text-red-400 text-xs rounded-lg flex items-center gap-2">
                      <span>⚠️</span> {saveError}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-3">
                    {savedId ? (
                      <div className="flex items-center gap-3 text-sm text-emerald-400">
                        <span>{t("ai.planSaved")}</span>
                        <Link href="/dashboard/user" className="underline font-semibold text-emerald-300 hover:text-emerald-200">
                          View in Dashboard →
                        </Link>
                      </div>
                    ) : (
                      <>
                        <input
                          type="text"
                          value={planTitle}
                          onChange={(e) => setPlanTitle(e.target.value)}
                          placeholder={t("ai.planName")}
                          className="input-field max-w-[220px] text-sm"
                        />
                        <button
                          onClick={handleSavePlan}
                          disabled={saving}
                          className="btn-primary text-sm disabled:opacity-50"
                        >
                          {saving ? "..." : t("ai.savePlan")}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-8">
                  <CalorieRing calories={plan.calories} />

                  <div className="flex-1 w-full space-y-4">
                    {plan.macros && (
                      <>
                        <MacroBar
                          label={t("ai.protein")} value={plan.macros.protein} unit="g"
                          color="bg-gradient-to-r from-blue-400 to-blue-500"
                          percent={(plan.macros.protein / 200) * 100}
                        />
                        <MacroBar
                          label={t("ai.carbs")} value={plan.macros.carbs} unit="g"
                          color="bg-gradient-to-r from-amber-400 to-orange-400"
                          percent={(plan.macros.carbs / 350) * 100}
                        />
                        <MacroBar
                          label={t("ai.fat")} value={plan.macros.fat} unit="g"
                          color="bg-gradient-to-r from-rose-400 to-pink-400"
                          percent={(plan.macros.fat / 100) * 100}
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-base font-bold text-white">📋 {t("ai.dailyMealSchedule")}</span>
                  <span className="text-xs text-slate-500">{t("ai.tapToExpand")}</span>
                </div>
                <div className="space-y-3">
                  {plan.meals.map((meal, i) => (
                    <MealCard key={meal.id} meal={meal} index={i} />
                  ))}
                </div>
              </div>

              {plan.tips && plan.tips.length > 0 && (
                <div className="glass p-6 rounded-2xl border border-white/5">
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <span>💡</span> {t("ai.nutritionTips")}
                  </h3>
                  <ul className="space-y-2.5">
                    {plan.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                        <span className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Shopping List */}
              {plan.shoppingList && plan.shoppingList.length > 0 && (
                <div className="glass p-6 rounded-2xl border border-white/5">
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <span>🛒</span> Shopping List
                    {plan.weeklyBudgetEstimateDZD && (
                      <span className="text-[11px] font-medium text-emerald-400 ml-auto">
                        ~{fDZD(plan.weeklyBudgetEstimateDZD)}
                      </span>
                    )}
                  </h3>
                  <div className="space-y-4">
                    {plan.shoppingList.map((cat, ci) => (
                      <div key={ci}>
                        <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">{cat.category}</h4>
                        <div className="space-y-1.5">
                          {cat.items.map((item, ii) => (
                            <div key={ii} className="flex items-center justify-between text-sm px-3 py-1.5 rounded-lg bg-white/[0.02]">
                              <span className="text-slate-300">{item.name}</span>
                              <div className="flex items-center gap-3 text-xs">
                                <span className="text-slate-500">{item.quantity}</span>
                                {item.estimatedCostDZD > 0 && (
                                  <span className="font-semibold text-emerald-400">{fDZD(item.estimatedCostDZD)}</span>
                                )}
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
          )}

          {/* ── Workout Tab ───────────────────────────────────────────── */}
          {activeTab === "workout" && plan.workout && (
            <div className="space-y-6">
              {/* Workout header */}
              <div className="glass p-6 lg:p-8 border border-emerald-500/20 rounded-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center text-lg">🏋️</div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{t("ai.workoutTab")}</h2>
                    <p className="text-xs text-slate-400">{plan.workout.goal}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                    <span className="text-sm">📅</span>
                    <div>
                      <p className="text-lg font-black text-white">{plan.workout.daysPerWeek}</p>
                      <p className="text-[10px] text-slate-500 font-semibold">{t("ai.daysPerWeek")}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sets & Reps Guide */}
              <div className="glass p-5 rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.03]">
                <div className="flex items-start gap-3">
                  <span className="text-lg shrink-0 mt-0.5">{t("ai.setsRepsGuide")}</span>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {t("ai.setsRepsDesc")}
                  </p>
                </div>
              </div>

              {/* Day cards */}
              <div className="space-y-3">
                {plan.workout.days.map((day, i) => (
                  <WorkoutDayCard key={i} day={day} index={i} />
                ))}
              </div>

              {/* General tips */}
              {plan.workout.generalTips && plan.workout.generalTips.length > 0 && (
                <div className="glass p-6 rounded-2xl border border-white/5">
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <span>💡</span> {t("ai.generalTips")}
                  </h3>
                  <ul className="space-y-2.5">
                    {plan.workout.generalTips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                        <span className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Fallback if no workout data */}
          {activeTab === "workout" && !plan.workout && (
            <div className="glass p-10 rounded-2xl border border-white/5 text-center">
              <p className="text-slate-400 text-sm">Workout plan data is not available. Regenerate your plan.</p>
            </div>
          )}
        </div>
      )}

      {/* ══ Buy Credits Modal ══ */}
      {showBuyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowBuyModal(false)}>
          <div className="glass p-8 rounded-2xl border border-white/10 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-2">🪙 Buy AI Credits</h3>
            <p className="text-xs text-slate-400 mb-6">Each credit = 1 AI generation. Price: <strong className="text-emerald-400">{fDZD(creditPrice)} / credit</strong></p>

            <div className="flex gap-2 mb-6">
              {[1, 5, 10, 25].map((n) => (
                <button
                  key={n}
                  onClick={() => setBuyCredits(n)}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all border ${
                    buyCredits === n
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                      : "border-white/10 text-slate-400 hover:border-white/20"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>

            <div className="text-center mb-6">
              <span className="text-2xl font-black text-white">{buyCredits}</span>
              <span className="text-slate-400 mx-2">×</span>
              <span className="text-emerald-400 font-bold">{fDZD(creditPrice)}</span>
              <div className="text-lg font-bold text-white mt-2">= {fDZD(buyCredits * creditPrice)}</div>
            </div>

            {buyError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg mb-4">{buyError}</div>
            )}
            {buySuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg mb-4">{buySuccess}</div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setShowBuyModal(false)} className="btn-ghost flex-1 text-sm !py-3">Cancel</button>
              <button onClick={handleBuyCredits} disabled={buyLoading}
                className="btn-primary flex-1 text-sm !py-3 disabled:opacity-50"
              >
                {buyLoading ? "..." : `Pay ${fDZD(buyCredits * creditPrice)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
