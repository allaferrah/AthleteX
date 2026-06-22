const { prisma } = require("../lib/prisma");
require("dotenv").config();

async function savePlan(data) {
  if (!prisma) return null;
  try {
    return await prisma.aIPlan.create({ data });
  } catch (e) {
    console.warn("DB save skipped (non-fatal):", e.message);
    return null;
  }
}

// ─── Input Validation ────────────────────────────────────────────────────────

function validateInputs({ age, weight, height, goal, days, gender, activityLevel, fitnessLevel, budget }) {
  const errors = [];

  if (!age || isNaN(age) || age < 10 || age > 100)
    errors.push("age must be a number between 10 and 100");

  if (!weight || isNaN(weight) || weight < 30 || weight > 300)
    errors.push("weight must be a number between 30 and 300 (kg)");

  if (!height || isNaN(height) || height < 100 || height > 250)
    errors.push("height must be a number between 100 and 250 (cm)");

  const validGoals = ["lose", "gain", "maintain"];
  if (!goal || !validGoals.includes(goal))
    errors.push(`goal must be one of: ${validGoals.join(", ")}`);

  if (!days || isNaN(days) || days < 2 || days > 7)
    errors.push("days must be a number between 2 and 7");

  const validGenders = ["male", "female"];
  if (!gender || !validGenders.includes(gender))
    errors.push(`gender must be one of: ${validGenders.join(", ")}`);

  const validActivity = ["sedentary", "light", "moderate", "active", "very_active"];
  if (!activityLevel || !validActivity.includes(activityLevel))
    errors.push(`activityLevel must be one of: ${validActivity.join(", ")}`);

  const validFitness = ["beginner", "intermediate", "advanced"];
  if (!fitnessLevel || !validFitness.includes(fitnessLevel))
    errors.push(`fitnessLevel must be one of: ${validFitness.join(", ")}`);

  const validBudgets = ["economy", "mid", "high"];
  if (!budget || !validBudgets.includes(budget))
    errors.push(`budget must be one of: ${validBudgets.join(", ")}`);

  return errors;
}

// ─── TDEE Calculation (Mifflin-St Jeor) ─────────────────────────────────────

function calculateTDEE(age, weight, height, gender, activityLevel) {
  const activityMultipliers = {
    sedentary: 1.2,    // desk job, no exercise
    light: 1.375,      // 1-3 days/week
    moderate: 1.55,    // 3-5 days/week
    active: 1.725,     // 6-7 days/week
    very_active: 1.9   // physical job + training
  };

  const bmr =
    gender === "male"
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;

  return Math.round(bmr * activityMultipliers[activityLevel]);
}

// ─── Algeria food context builder ───────────────────────────────────────────

function buildAlgerianFoodContext(goal, budget, dietaryPreference) {

  const algeriaEconomy = {
    desc: "low-cost Algerian supermarket foods",
    proteins: "chicken thighs, eggs, sardines, tuna, lentils, chickpeas",
    carbs: "rice, bread, potatoes, pasta",
    fats: "olive oil, vegetable oil",
    vegetables: "tomatoes, onions, carrots, lettuce, cucumber",
    fruits: "bananas, apples, oranges, dates",
    avoid: "all imported fitness foods and supplements"
  };

  const allowedFoods = `
ONLY use common foods available in Algerian supermarkets and local markets.

CHEAP PROTEINS:
- Chicken breast
- Chicken thighs
- Eggs
- Sardines
- Canned tuna
- Lentils
- Chickpeas
- White beans (haricot)
- Milk
- Plain yogurt

CHEAP CARBS:
- White rice
- Potatoes
- Bread (khobz)
- Pasta

VEGETABLES:
- Tomato
- Onion
- Carrot
- Lettuce
- Cucumber
- Zucchini
- Green beans
- Bell pepper

FRUITS:
- Banana
- Apple
- Orange
- Dates
- Seasonal fruits

FATS:
- Olive oil
- Vegetable oil

DO NOT USE:
- Quinoa
- Avocado
- Salmon
- Protein powder
- Whey
- Chia seeds
- Almond milk
- Greek yogurt
- Cottage cheese
- Imported cheeses
- Expensive nuts
- Superfoods
- Couscous
`;

  const goalMealStyle = {
    lose: "smaller portions, high protein, high fiber, low simple carbs. Prioritize vegetables with every meal. Avoid: fried foods, sugary drinks, white bread in large quantities, pastries, chips",
    gain: "calorie-dense, high protein meals. Include: extra olive oil drizzle, larger portions, frequent meals, post-workout nutrition within 30 min",
    maintain: "balanced eating pattern — 3 main meals + 1-2 snacks, focusing on whole foods and portion control"
  };

  const mealPattern = `
MEAL TIMING:
- Breakfast: 07:00–08:30
- Morning Snack: 10:30–11:00
- Lunch: 12:30–13:30
- Afternoon Snack: 16:00–17:00
- Dinner: 19:00–20:30

GENERAL GUIDELINES:
1. Drink water throughout the day (aim for 2-3L)
2. Include protein with every meal for satiety
3. Prioritize whole foods over processed options
4. Adjust portion sizes based on hunger cues`;

  return {
    budgetInfo: algeriaEconomy,
    goalStyle: goalMealStyle[goal],
    mealPattern: mealPattern,
    allowedFoods: allowedFoods,
    dietaryNote: dietaryPreference === "vegan"
      ? "User is VEGAN: replace all meat/fish/dairy with: chickpeas, lentils, beans. No eggs, no dairy."
      : dietaryPreference === "vegetarian"
      ? "User is VEGETARIAN: no meat or fish. Use eggs, yogurt, lentils, chickpeas, beans as protein sources."
      : "No dietary restrictions. Include meat, fish, dairy as normal."
  };
}

// ─── Main Controller ─────────────────────────────────────────────────────────

exports.generatePlan = async (req, res) => {
  try {
    const {
      age,
      weight,
      height,
      goal,
      days,
      gender,
      activityLevel,
      fitnessLevel,
      workoutPlace,
      dietaryPreference = "none",
      budget = "mid",
    } = req.body;

    // ── Validate ─────────────────────────────────────────────────────────────
    const errors = validateInputs({ age, weight, height, goal, days, gender, activityLevel, fitnessLevel, budget });
    if (errors.length > 0) {
      return res.status(400).json({ message: "Validation failed", errors });
    }

    // ── Compute TDEE ──────────────────────────────────────────────────────────
    const tdee = calculateTDEE(Number(age), Number(weight), Number(height), gender, activityLevel);
    const calorieTarget =
      goal === "lose" ? tdee - 500 :
      goal === "gain" ? tdee + 300 :
      tdee;

    // Protein target: 1.6–2.2g per kg bodyweight for active goals
    const proteinTarget =
      goal === "gain" ? Math.round(Number(weight) * 2.0) :
      goal === "lose" ? Math.round(Number(weight) * 1.8) :
      Math.round(Number(weight) * 1.4);

    const fatTarget = Math.round((calorieTarget * 0.25) / 9);  // 25% of calories from fat
    const carbTarget = Math.round((calorieTarget - (proteinTarget * 4) - (fatTarget * 9)) / 4);

    const location = workoutPlace || "gym";
    const equipment =
      location === "home"
        ? "ONLY bodyweight exercises (push-ups, squats, lunges, planks, dips, glute bridges, mountain climbers) — NO barbells, NO dumbbells, NO cables, NO machines, NO weights"
        : "full gym equipment (barbell, dumbbell, cables, machines, leg press, lat pulldown)";

    // ── Build food context ────────────────────────────────────────────────────
    const algeriaContext = buildAlgerianFoodContext(goal, budget, dietaryPreference);

    // ── Prompt ────────────────────────────────────────────────────────────────
    const prompt = `Generate a complete personalized nutrition and workout plan as a single JSON object with exactly two top-level keys: "nutrition" and "workout".

════════════════════════════════
ALGERIA FOOD RULES
════════════════════════════════

The user lives in Algeria.

Meals MUST be based on:
- Rice + Chicken
- Rice + Eggs
- Rice + Sardines
- Lentils
- Chickpeas
- Potatoes
- Bread
- Tuna
- Seasonal vegetables

${algeriaContext.allowedFoods}

ALGERIA BUDGET CONTEXT:
${algeriaContext.budgetInfo.desc}
- Proteins: ${algeriaContext.budgetInfo.proteins}
- Carbs: ${algeriaContext.budgetInfo.carbs}
- Fats: ${algeriaContext.budgetInfo.fats}
- Vegetables: ${algeriaContext.budgetInfo.vegetables}
- Fruits: ${algeriaContext.budgetInfo.fruits}
- AVOID: ${algeriaContext.budgetInfo.avoid}

DIETARY NOTE: ${algeriaContext.dietaryNote}

GOAL STYLE: ${algeriaContext.goalStyle}

════════════════════════════════
IMPORTANT: REUSE INGREDIENTS
════════════════════════════════

Do NOT create 20 different ingredients for one day.

Reuse ingredients across meals. Example:

Breakfast:   Eggs + Bread + Banana
Lunch:       Chicken + Rice + Tomato salad
Snack:       Yogurt + Banana
Dinner:      Chicken + Rice + Carrots

Same chicken, same rice, same banana — just different quantities.

════════════════════════════════
ACCEPTABLE MEAL TEMPLATES
════════════════════════════════

Breakfast examples:
- 3 eggs + bread + tea
- milk + bread + banana

Lunch examples:
- grilled chicken + rice + tomato salad
- chicken thighs + rice + carrots

Dinner examples:
- tuna sandwich + cucumber
- eggs + potatoes + salad

At least one main meal MUST contain chicken and rice.

════════════════════════════════
USER PROFILE
════════════════════════════════
- Goal: ${goal} (${goal === "lose" ? "fat loss" : goal === "gain" ? "muscle building" : "maintenance"})
- Gender: ${gender} | Age: ${age} | Weight: ${weight}kg | Height: ${height}cm
- Activity Level: ${activityLevel} | Fitness Level: ${fitnessLevel}
- Workout: ${location} (${equipment}) | ${days} days/week
- TDEE: ${tdee} kcal → Target: ${calorieTarget} kcal
- Macro targets: Protein ${proteinTarget}g | Carbs ${carbTarget}g | Fat ${fatTarget}g

════════════════════════════════
NUTRITION JSON SCHEMA
════════════════════════════════
{
  "calories": ${calorieTarget},
  "macros": {
    "protein": ${proteinTarget},
    "carbs": ${carbTarget},
    "fat": ${fatTarget}
  },
  "meals": [
    {
      "id": "breakfast|morning_snack|lunch|afternoon_snack|dinner",
      "name": string (simple dish name, e.g. "Grilled Chicken with Rice", "Scrambled Eggs on Toast"),
      "time": string (e.g. "08:00", "13:00", "19:30"),
      "icon": string (emoji matching the meal),
      "calories": number,
      "items": [
        {
          "name": string (ingredient name in English),
          "amount": string (e.g. "150g", "2 pieces", "1 cup"),
          "calories": number,
          "protein": number (grams),
          "carbs": number (grams),
          "fat": number (grams)
        }
      ],
      "preparation": string (brief cooking method: "pan-fried with 1 tsp oil", "baked at 180°C", "steamed"),
      "notes": string (practical tips: substitutions, storage, meal prep advice)
    }
  ],
  "shoppingList": [
    {
      "category": "Meat & Protein | Dairy | Grains & Bread | Vegetables | Fruits | Fats & Oils | Spices & Condiments",
      "items": [ { "name": string, "quantity": string, "estimatedCostDZD": number } ]
    }
  ],
  "weeklyBudgetEstimateDZD": number,
  "tips": [string (practical tips: where to buy, how to meal prep, seasonal substitutions, estimated DZD prices)]
}

════════════════════════════════
WORKOUT JSON SCHEMA
════════════════════════════════
{
  "goal": string,
  "daysPerWeek": ${days},
  "days": [
    {
      "day": "Day 1",
      "focus": "specific muscle group (Home example: Upper Body / Lower Body / Full Body / Core — Gym example: Chest & Triceps / Back & Biceps / Legs / Shoulders & Abs)",
      "warmUp":   [ { "exercise": string, "sets": "1", "reps": string, "notes": string } ],
      "exercises": [ { "exercise": string, "sets": string, "reps": string, "notes": string (MUST include: rest time + form cue for ${fitnessLevel}) } ],
      "coolDown": [ { "exercise": string, "sets": "1", "reps": string, "notes": string } ],
      "tips": [string]
    }
  ],
  "generalTips": [string]
}

════════════════════════════════
STRICT RULES
════════════════════════════════
1. Generate EXACTLY ${days} workout day objects (daysPerWeek = ${days})
2. Meal calories MUST sum to approximately ${calorieTarget} kcal (±50 kcal tolerance)
3. Macro totals MUST match: ~${proteinTarget}g protein, ~${carbTarget}g carbs, ~${fatTarget}g fat
4. Use ONLY foods from the allowed list above — no imported fitness foods
5. At least one main meal MUST contain chicken and rice
6. Reuse ingredients across meals (max ~10 unique ingredients per day)
7. Generate practical meals an Algerian student or worker can cook
8. Include EXACTLY 5 meals: breakfast, morning_snack, lunch, afternoon_snack, dinner
9. Include shoppingList with realistic DZD prices (Algerian supermarket items only)
10. Workout sets/reps/intensity MUST match "${fitnessLevel}" level
11. Return ONLY valid JSON — no markdown, no backticks, no extra text
12. ALL workout content — exercise names, warm-up, cool-down, focus, notes, tips, generalTips — MUST be written in English
13. HOME WORKOUT: Since location is "${location}", ${location === "home" ? "ALL exercises MUST be bodyweight-only: push-ups, squats, lunges, planks, dips, glute bridges, mountain climbers, step-ups (on chair), calf raises, wall sit, superman, bird-dog, bicycle crunches. NO equipment. NO dumbbells. NO barbells. NO resistance bands. NO weights of any kind." : "Use standard gym equipment: barbell, dumbbell, cables, machines, leg press, lat pulldown, preacher curl, etc. Exercise names in English."}`;

    // ── OpenRouter Request ────────────────────────────────────────────────────
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "AthletiX Market"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a nutritionist and personal trainer. " +
              "You recommend only foods available in Algerian supermarkets and local markets. " +
              "Focus on affordable, practical meals using chicken, rice, eggs, bread, tuna, sardines, lentils, and seasonal vegetables. " +
              "No imported fitness foods. " +
              "Return ONLY valid JSON. No markdown. No backticks. No extra text. " +
              "ALL content in English."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.65,   // slightly lower for more consistent structured output
        max_tokens: 4000
      })
    });

    // ── Handle API Errors ─────────────────────────────────────────────────────
    if (!response.ok) {
      const errBody = await response.text();
      console.error("OpenRouter error:", errBody);
      return res.status(500).json({ error: `OpenRouter API error: ${response.status}` });
    }

    const data = await response.json();
    const aiContent = data?.choices?.[0]?.message?.content;

    if (!aiContent) throw new Error("Empty response from AI");

    // ── Clean & Parse ─────────────────────────────────────────────────────────
    const cleaned = aiContent
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    let planJSON;
    try {
      planJSON = JSON.parse(cleaned);
    } catch (e) {
      console.error("Invalid JSON from AI:", cleaned.slice(0, 500));
      return res.status(500).json({ error: "AI returned invalid JSON format" });
    }

    // ── Extract ───────────────────────────────────────────────────────────────
    const hasNewFormat = planJSON.nutrition && planJSON.workout;
    const nutrition = hasNewFormat ? planJSON.nutrition : planJSON;
    const workout = hasNewFormat ? planJSON.workout : null;

    if (!workout) {
      return res.status(500).json({ error: "AI did not return a workout plan. Please retry." });
    }

    // ── Validate day count ────────────────────────────────────────────────────
    if (workout.days?.length !== Number(days)) {
      console.warn(`AI returned ${workout.days?.length} days instead of ${days}. Trimming.`);
      workout.days = workout.days?.slice(0, Number(days));
    }

    // ── Validate calorie accuracy ─────────────────────────────────────────────
    const mealCalorieSum = nutrition.meals?.reduce((sum, m) => sum + (m.calories || 0), 0);
    const calorieDrift = Math.abs(mealCalorieSum - calorieTarget);
    if (calorieDrift > 200) {
      console.warn(`Calorie drift: AI returned ${mealCalorieSum} vs target ${calorieTarget} (diff: ${calorieDrift})`);
    }

    // ── Build legacy text for DB ──────────────────────────────────────────────
    const mealPlanText = nutrition.meals
      .map(
        (m) =>
          `[${m.time}] ${m.name}:\n` +
          m.items.map((i) => `  - ${i.name} (${i.amount}) — ${i.calories} kcal`).join("\n") +
          (m.preparation ? `\n  📋 Préparation: ${m.preparation}` : "") +
          (m.notes ? `\n  💡 Note: ${m.notes}` : "")
      )
      .join("\n\n");

    const workoutPlanText =
      "📅 Programme d'Entraînement Hebdomadaire\n\n" +
      workout.days
        .map(
          (d) =>
            `${d.day} — ${d.focus}\n` +
            "Échauffement:\n" +
            (d.warmUp || []).map((w) => `  - ${w.exercise}: ${w.sets}x${w.reps}`).join("\n") +
            "\nExercices:\n" +
            (d.exercises || []).map((e) => `  - ${e.exercise}: ${e.sets}x${e.reps}${e.notes ? " — " + e.notes : ""}`).join("\n") +
            "\nRécupération:\n" +
            (d.coolDown || []).map((c) => `  - ${c.exercise}: ${c.reps}`).join("\n")
        )
        .join("\n---\n\n") +
      (workout.generalTips?.length
        ? "\n💡 Conseils:\n" + workout.generalTips.map((t) => `  - ${t}`).join("\n")
        : "");

    // ── Save to DB ────────────────────────────────────────────────────────────
    savePlan({
      userId: req.user?.userId || 1,
      calories: nutrition.calories,
      mealPlan: mealPlanText,
      workoutPlan: workoutPlanText,
      workoutPlace: location
    });

    // ── Increment usage counter ───────────────────────────────────────────────
    try {
      await prisma.user.update({
        where: { id: req.user.userId },
        data: { aiGenerationsUsed: { increment: 1 } },
      });
    } catch (e) {
      console.warn("Failed to increment AI usage counter:", e.message);
    }

    // ── Response ──────────────────────────────────────────────────────────────
    res.status(201).json({
      message: "AI Plan generated successfully",
      plan: {
        id: null,
        userId: req.user?.userId || 1,

        // Nutrition
        calories: nutrition.calories,
        tdee,
        calorieTarget,
        macros: nutrition.macros,
        meals: nutrition.meals,
        shoppingList: nutrition.shoppingList || [],
        weeklyBudgetEstimateDZD: nutrition.weeklyBudgetEstimateDZD || null,
        tips: nutrition.tips || [],

        // Workout
        workout,

        // Meta
        profile: {
          age, weight, height, gender, goal,
          activityLevel, fitnessLevel, days,
          workoutPlace: location, budget,
          dietaryPreference
        },
        calorieDrift: calorieDrift > 50 ? calorieDrift : 0,
        createdAt: new Date().toISOString()
      }
    });

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ─── Save Plan ─────────────────────────────────────────────────────────────────

exports.savePlan = async (req, res) => {
  try {
    const { title, calories, mealPlan, workoutPlan, workoutPlace, data } = req.body;
    const plan = await prisma.aIPlan.create({
      data: {
        userId: req.user.userId,
        title: title || null,
        calories: calories || 0,
        mealPlan: mealPlan || "",
        workoutPlan: workoutPlan || null,
        workoutPlace: workoutPlace || null,
        data: data || undefined,
      }
    });
    res.status(201).json({ message: "Plan saved", plan });
  } catch (err) {
    console.error("Save plan error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ─── Get All Plans ─────────────────────────────────────────────────────────────

exports.getPlans = async (req, res) => {
  try {
    const plans = await prisma.aIPlan.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, title: true, calories: true,
        workoutPlace: true, scheduledDate: true,
        isActive: true, createdAt: true,
      }
    });
    res.json({ plans });
  } catch (err) {
    console.error("Get plans error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ─── Get One Plan ──────────────────────────────────────────────────────────────

exports.getPlan = async (req, res) => {
  try {
    const plan = await prisma.aIPlan.findFirst({
      where: { id: req.params.id, userId: req.user.userId },
    });
    if (!plan) return res.status(404).json({ error: "Plan not found" });
    res.json({ plan });
  } catch (err) {
    console.error("Get plan error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ─── Update Plan ───────────────────────────────────────────────────────────────

exports.updatePlan = async (req, res) => {
  try {
    const { title, scheduledDate, isActive } = req.body;
    const plan = await prisma.aIPlan.findFirst({
      where: { id: req.params.id, userId: req.user.userId },
    });
    if (!plan) return res.status(404).json({ error: "Plan not found" });

    // If setting this plan as active, deactivate all others first
    if (isActive) {
      await prisma.aIPlan.updateMany({
        where: { userId: req.user.userId, isActive: true },
        data: { isActive: false },
      });
    }

    const updated = await prisma.aIPlan.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(scheduledDate !== undefined && { scheduledDate: scheduledDate ? new Date(scheduledDate) : null }),
        ...(isActive !== undefined && { isActive }),
      }
    });
    res.json({ plan: updated });
  } catch (err) {
    console.error("Update plan error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ─── Delete Plan ───────────────────────────────────────────────────────────────

exports.deletePlan = async (req, res) => {
  try {
    const plan = await prisma.aIPlan.findFirst({
      where: { id: req.params.id, userId: req.user.userId },
    });
    if (!plan) return res.status(404).json({ error: "Plan not found" });
    await prisma.aIPlan.delete({ where: { id: req.params.id } });
    res.json({ message: "Plan deleted" });
  } catch (err) {
    console.error("Delete plan error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ─── Get AI Config ──────────────────────────────────────────────────────────────

exports.getConfig = async (req, res) => {
  try {
    let config = await prisma.aIConfig.findUnique({ where: { id: "default" } });
    if (!config) {
      config = await prisma.aIConfig.create({
        data: { id: "default", creditPrice: 500, freeGenerations: 3 },
      });
    }
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};