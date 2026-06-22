const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

const SPORTS = [
  { name: "Football", nameAr: "كرة القدم", icon: "⚽", description: "Find expert football coaches, personal trainers, and performance specialists for soccer training and development.", descriptionAr: "اعثر على مدربي كرة قدم خبراء ومدربين شخصيين ومتخصصي أداء للتدريب والتطوير.", sortOrder: 1 },
  { name: "Handball", nameAr: "كرة اليد", icon: "🤾", description: "Connect with professional handball coaches for team training, individual skill development, and tactical coaching.", descriptionAr: "تواصل مع مدربي كرة اليد المحترفين للتدريب الجماعي وتطوير المهارات الفردية والتدريب التكتيكي.", sortOrder: 2 },
  { name: "Volleyball", nameAr: "الكرة الطائرة", icon: "🏐", description: "Expert volleyball coaches for technical training, team strategy, and competitive preparation.", descriptionAr: "مدربو كرة طائرة خبراء للتدريب التقني والاستراتيجية الجماعية والتحضير التنافسي.", sortOrder: 3 },
  { name: "Boxing", nameAr: "الملاكمة", icon: "🥊", description: "Professional boxing coaches for technique, conditioning, and competition training at all levels.", descriptionAr: "مدربو ملاكمة محترفون للتقنية واللياقة البدنية والتدريب التنافسي لجميع المستويات.", sortOrder: 4 },
  { name: "Athletics", nameAr: "ألعاب القوى", icon: "🏃", description: "Track and field coaches for sprinting, distance running, jumping, and throwing events.", descriptionAr: "مدربو ألعاب قوى للعدو والجري لمسافات طويلة والقفز ورياضات الرمي.", sortOrder: 5 },
  { name: "Judo", nameAr: "الجودو", icon: "🥋", description: "Qualified judo instructors for technique, grappling, and competitive martial arts training.", descriptionAr: "مدربو جودو مؤهلون للتقنية والمصارعة والتدريب على الفنون القتالية التنافسية.", sortOrder: 6 },
  { name: "Basketball", nameAr: "كرة السلة", icon: "🏀", description: "Experienced basketball coaches for skill development, team tactics, and game strategy.", descriptionAr: "مدربو كرة سلة ذوو خبرة لتطوير المهارات والتكتيكات الجماعية واستراتيجية اللعبة.", sortOrder: 7 },
  { name: "Swimming", nameAr: "السباحة", icon: "🏊", description: "Professional swimming coaches for technique improvement, endurance training, and competitive preparation.", descriptionAr: "مدربو سباحة محترفون لتحسين التقنية والتدريب على التحمل والتحضير التنافسي.", sortOrder: 8 },
  { name: "Cycling", nameAr: "ركوب الدراجات", icon: "🚴", description: "Expert cycling coaches for endurance training, technique, and race preparation across all disciplines.", descriptionAr: "مدربو ركوب دراجات خبراء للتدريب على التحمل والتقنية والتحضير للسباقات في جميع التخصصات.", sortOrder: 9 },
  { name: "Tennis", nameAr: "كرة المضرب", icon: "🎾", description: "Professional tennis coaches for technique, match strategy, and fitness training for all levels.", descriptionAr: "مدربو كرة مضرب محترفون للتقنية واستراتيجية المباراة والتدريب البدني لجميع المستويات.", sortOrder: 10 },
];

async function main() {
  // Seed admin
  const email = "admin@athletix.com";
  const existingAdmin = await prisma.user.findUnique({ where: { email } });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash("Admin123!", 10);
    const admin = await prisma.user.create({
      data: { email, password: hashedPassword, role: "ADMIN" },
    });
    console.log("Admin created:", admin.email);
  } else {
    console.log("Admin already exists:", email);
  }

  // Seed 10 sports
  for (const sport of SPORTS) {
    const existing = await prisma.sportCategory.findUnique({ where: { name: sport.name } });
    if (!existing) {
      await prisma.sportCategory.create({ data: sport });
      console.log("Sport created:", sport.name);
    } else {
      console.log("Sport already exists:", sport.name);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
