"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale } from "@/i18n/LocaleContext";
import { aiAPI } from "@/lib/api";
import { fDZD } from "@/lib/format";
import { isLoggedIn } from "@/lib/auth";
import Link from "next/link";

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

interface PlanData {
  calories: number;
  tdee: number;
  calorieTarget: number;
  macros: Macros;
  meals: Meal[];
  tips: string[];
  workout?: WorkoutPlan;
  shoppingList?: ShoppingCategory[];
  weeklyBudgetEstimateDZD?: number;
  profile?: {
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

interface SavedPlan {
  id: string;
  title: string;
  calories: number;
  scheduledDate: string | null;
  isActive: boolean;
  data: PlanData;
}

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
        <div className={`h-full rounded-full transition-all duration-1000 ease-out ${color}`} style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
    </div>
  );
}

export default function PlanViewPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useLocale();
  const id = params?.id as string;

  const [plan, setPlan] = useState<SavedPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"nutrition" | "workout" | "shopping">("nutrition");
  const [scheduling, setScheduling] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");

  // Checkboxes stored in localStorage keyed by planId
  const storageKey = `plan_${id}_checked`;
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    if (!id) return;
    const saved = localStorage.getItem(storageKey);
    if (saved) setChecked(JSON.parse(saved));
    loadPlan();
  }, [id]);

  const loadPlan = async () => {
    setLoading(true);
    try {
      const data = await aiAPI.getPlan(id);
      setPlan(data.plan);
      if (data.plan.scheduledDate) {
        setScheduleDate(data.plan.scheduledDate.split("T")[0]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleChecked = (key: string) => {
    setChecked((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  const handleSchedule = async () => {
    if (!scheduleDate) return;
    setScheduling(true);
    try {
      await aiAPI.updatePlan(id, { scheduledDate: scheduleDate });
    } catch {} finally {
      setScheduling(false);
    }
  };

  const handleSetActive = async () => {
    try {
      await aiAPI.updatePlan(id, { isActive: true });
      setPlan((prev) => prev ? { ...prev, isActive: true } : prev);
    } catch {}
  };

  const pd = plan?.data;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-slate-400 text-sm">Loading plan...</p>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <div className="text-5xl mb-4 opacity-60">📋</div>
        <p className="text-red-400 text-sm mb-4">{error || "Plan not found"}</p>
        <Link href="/dashboard/user" className="btn-primary inline-block px-6 py-2">← Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">

      {/* Header */}
      <div className="glass p-6 lg:p-8 rounded-2xl border border-emerald-500/20 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-lg">🥗</div>
            <div>
              <h1 className="text-xl font-bold text-white">{plan.title || t("ai.planViewTitle")}</h1>
              <p className="text-xs text-slate-400">
                {pd?.calories || plan.calories} kcal
                {pd?.profile?.goal && ` · ${pd.profile.goal}`}
                {pd?.profile?.budget && ` · ${pd.profile.budget}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {!plan.isActive && (
              <button onClick={handleSetActive} className="btn-ghost text-xs !py-2 !px-3">
                📌 {t("ai.activePlan")}
              </button>
            )}
            {plan.isActive && (
              <span className="px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold rounded-lg">
                ✅ {t("ai.activePlan")}
              </span>
            )}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="input-field !py-2 text-xs w-[150px]"
              />
              <button onClick={handleSchedule} disabled={scheduling}
                className="btn-primary text-xs !py-2 !px-3 disabled:opacity-50"
              >
                {scheduling ? "..." : "📅"}
              </button>
            </div>
            <Link href="/dashboard/user" className="btn-ghost text-xs !py-2 !px-3">← {t("common.back")}</Link>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="glass p-1.5 rounded-2xl flex gap-1 border border-white/5 mb-6">
        {[
          { key: "nutrition" as const, label: "🥗 " + t("ai.nutritionTab"), show: true },
          { key: "workout" as const, label: "🏋️ " + t("ai.workoutTab"), show: !!pd?.workout },
          { key: "shopping" as const, label: "🛒 " + t("ai.shoppingChecklist"), show: !!(pd?.shoppingList?.length) },
        ].filter((t) => t.show).map((tab) => (
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

      {/* Nutrition Tab */}
      {activeTab === "nutrition" && pd && (
        <div className="space-y-6">
          <div className="glass p-6 rounded-2xl border border-white/5">
            <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <span>📊</span> {t("ai.mealTracking")}
            </h2>
            <div className="flex flex-col sm:flex-row items-center gap-6 mb-4">
              <div className="text-center">
                <div className="text-3xl font-black text-emerald-400">{pd.calories}</div>
                <p className="text-[10px] text-slate-500 font-semibold">{t("ai.kcalDay")}</p>
              </div>
              <div className="flex-1 w-full space-y-3">
                <MacroBar label={t("ai.protein")} value={pd.macros.protein} unit="g" color="bg-gradient-to-r from-blue-400 to-blue-500" percent={(pd.macros.protein / 200) * 100} />
                <MacroBar label={t("ai.carbs")} value={pd.macros.carbs} unit="g" color="bg-gradient-to-r from-amber-400 to-orange-400" percent={(pd.macros.carbs / 350) * 100} />
                <MacroBar label={t("ai.fat")} value={pd.macros.fat} unit="g" color="bg-gradient-to-r from-rose-400 to-pink-400" percent={(pd.macros.fat / 100) * 100} />
              </div>
            </div>
          </div>

          {pd.meals.map((meal, mi) => {
            const mealKey = `meal_${mi}`;
            const allEaten = meal.items.every((_, ii) => checked[`${mealKey}_${ii}`]);
            return (
              <div key={mi} className="glass rounded-2xl overflow-hidden border border-white/5">
                <div className="flex items-center gap-4 p-5">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-xl">{meal.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-sm">{meal.name}</h3>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{meal.time}</span>
                      {allEaten && <span className="text-[10px] font-bold text-emerald-400">✅ {t("ai.completed")}</span>}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{meal.calories} {t("ai.kcal")}</p>
                  </div>
                </div>
                <div className="border-t border-white/5 px-5 pb-4 pt-3 space-y-2">
                  {meal.items.map((item, ii) => {
                    const itemKey = `${mealKey}_${ii}`;
                    return (
                      <label key={ii} className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition ${checked[itemKey] ? "bg-emerald-500/5" : "hover:bg-white/[0.02]"}`}>
                        <input
                          type="checkbox"
                          checked={!!checked[itemKey]}
                          onChange={() => toggleChecked(itemKey)}
                          className="w-4 h-4 rounded accent-emerald-500"
                        />
                        <span className={`flex-1 text-sm ${checked[itemKey] ? "text-slate-500 line-through" : "text-slate-300"}`}>{item.name}</span>
                        <span className="text-xs text-slate-500">{item.amount}</span>
                        <span className="text-xs font-semibold text-slate-400">{item.calories} {t("ai.kcal")}</span>
                      </label>
                    );
                  })}
                  {meal.preparation && (
                    <div className="mt-2 p-3 rounded-xl bg-sky-500/5 border border-sky-500/15 flex items-start gap-2">
                      <span className="text-xs shrink-0">📋</span>
                      <p className="text-xs text-sky-300/80">{meal.preparation}</p>
                    </div>
                  )}
                  {meal.notes && (
                    <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 flex items-start gap-2">
                      <span className="text-xs shrink-0">💡</span>
                      <p className="text-xs text-amber-300/80">{meal.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {pd.tips?.length > 0 && (
            <div className="glass p-6 rounded-2xl border border-white/5">
              <h3 className="text-sm font-bold text-white mb-3">💡 {t("ai.nutritionTips")}</h3>
              <ul className="space-y-2">
                {pd.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-emerald-400 font-bold shrink-0">{i + 1}.</span> {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Workout Tab */}
      {activeTab === "workout" && pd?.workout && (
        <div className="space-y-6">
          <div className="glass p-6 rounded-2xl border border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center text-lg">🏋️</div>
              <div>
                <h2 className="text-lg font-bold text-white">{t("ai.workoutTracking")}</h2>
                <p className="text-xs text-slate-400">{pd.workout.goal}</p>
              </div>
            </div>

            {/* Sets & Reps Guide */}
            <div className="mb-4 p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/15">
              <div className="flex items-start gap-2">
                <span className="text-sm shrink-0">{t("ai.setsRepsGuide")}</span>
                <p className="text-xs text-slate-400">{t("ai.setsRepsDesc")}</p>
              </div>
            </div>

            {/* Day cards */}
            {pd.workout.days.map((day, di) => {
              const dayKey = `workout_${di}`;
              const allDone = day.exercises.every((_, ei) => checked[`${dayKey}_ex_${ei}`]);
              return (
                <div key={di} className="glass rounded-2xl overflow-hidden border border-white/5 mb-3">
                  <div className="flex items-center gap-4 p-5">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-lg">🏋️</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white text-sm">{day.day}</h3>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">{day.focus}</span>
                        {allDone && <span className="text-[10px] font-bold text-emerald-400">✅ {t("ai.completed")}</span>}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{day.exercises.length} {t("ai.exercise").toLowerCase()}s</p>
                    </div>
                  </div>

                  {/* Warm-up */}
                  {day.warmUp?.length > 0 && (
                    <div className="px-5 pb-2">
                      <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1.5">🔥 {t("ai.warmUp")}</p>
                      {day.warmUp.map((ex, ei) => (
                        <div key={ei} className="flex items-center gap-2 text-xs text-slate-400 py-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500/60 shrink-0" />
                          <span className="text-slate-300">{ex.exercise}</span>
                          <span className="text-slate-500 ml-auto">{ex.sets}×{ex.reps}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Exercises */}
                  <div className="px-5 pb-3 pt-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">💪 {t("ai.exercise")}s</p>
                    <div className="space-y-1.5">
                      {day.exercises.map((ex, ei) => {
                        const exKey = `${dayKey}_ex_${ei}`;
                        return (
                          <label key={ei} className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition ${checked[exKey] ? "bg-emerald-500/5" : "hover:bg-white/[0.02]"}`}>
                            <input
                              type="checkbox"
                              checked={!!checked[exKey]}
                              onChange={() => toggleChecked(exKey)}
                              className="w-4 h-4 rounded accent-emerald-500 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold ${checked[exKey] ? "text-slate-500 line-through" : "text-white"}`}>{ex.exercise}</p>
                              {ex.notes && <p className="text-[10px] text-slate-500 mt-0.5">{ex.notes}</p>}
                            </div>
                            <span className="text-xs font-bold text-slate-400 shrink-0">{ex.sets} × {ex.reps}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Cool-down */}
                  {day.coolDown?.length > 0 && (
                    <div className="px-5 pb-3">
                      <p className="text-[10px] font-bold text-sky-400 uppercase tracking-wider mb-1.5">🧘 {t("ai.coolDown")}</p>
                      {day.coolDown.map((ex, ei) => (
                        <div key={ei} className="flex items-center gap-2 text-xs text-slate-400 py-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-500/60 shrink-0" />
                          <span className="text-slate-300">{ex.exercise}</span>
                          <span className="text-slate-500 ml-auto">{ex.reps}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Day tips */}
                  {day.tips?.length > 0 && (
                    <div className="px-5 pb-4 space-y-1">
                      {day.tips.map((tip, ti) => (
                        <div key={ti} className="flex items-start gap-2 text-xs text-slate-400">
                          <span>💡</span> {tip}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* General tips */}
            {pd.workout.generalTips?.length > 0 && (
              <div className="mt-4 p-5 rounded-xl bg-white/[0.02] border border-white/5">
                <h3 className="text-xs font-bold text-white mb-3">💡 {t("ai.generalTips")}</h3>
                <ul className="space-y-2">
                  {pd.workout.generalTips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                      <span className="text-emerald-400 font-bold shrink-0">{i + 1}.</span> {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Shopping Tab */}
      {activeTab === "shopping" && pd?.shoppingList && (
        <div className="space-y-6">
          <div className="glass p-6 rounded-2xl border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>🛒</span> {t("ai.shoppingChecklist")}
              </h2>
              {pd.weeklyBudgetEstimateDZD && (
                <span className="text-xs font-semibold text-emerald-400">~{fDZD(pd.weeklyBudgetEstimateDZD)}</span>
              )}
            </div>
            <div className="space-y-5">
              {pd.shoppingList.map((cat, ci) => {
                const allBought = cat.items.every((_, ii) => checked[`shop_${ci}_${ii}`]);
                return (
                  <div key={ci}>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{cat.category}</h3>
                      {allBought && <span className="text-[10px] text-emerald-400">✅ {t("ai.completed")}</span>}
                    </div>
                    <div className="space-y-1">
                      {cat.items.map((item, ii) => {
                        const shopKey = `shop_${ci}_${ii}`;
                        return (
                          <label key={ii} className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition ${checked[shopKey] ? "bg-emerald-500/5" : "hover:bg-white/[0.02]"}`}>
                            <input
                              type="checkbox"
                              checked={!!checked[shopKey]}
                              onChange={() => toggleChecked(shopKey)}
                              className="w-4 h-4 rounded accent-emerald-500 shrink-0"
                            />
                            <span className={`flex-1 text-sm ${checked[shopKey] ? "text-slate-500 line-through" : "text-slate-300"}`}>{item.name}</span>
                            <span className="text-xs text-slate-500">{item.quantity}</span>
                            {item.estimatedCostDZD > 0 && (
                              <span className="text-xs font-semibold text-emerald-400">{fDZD(item.estimatedCostDZD)}</span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
