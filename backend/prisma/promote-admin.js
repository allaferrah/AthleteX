const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { prisma, withRetry } = require("../src/lib/prisma");
const bcrypt = require("bcrypt");

async function main() {
  const email = "admin@athletix.com";
  console.log("Connecting to database...");

  const user = await withRetry(() => prisma.user.findUnique({ where: { email } }));

  if (!user) {
    const hashed = await bcrypt.hash("Admin123!", 10);
    await withRetry(() =>
      prisma.user.create({
        data: { email, password: hashed, role: "ADMIN" },
      })
    );
    console.log("Admin created");
  } else {
    await withRetry(() =>
      prisma.user.update({
        where: { email },
        data: { role: "ADMIN" },
      })
    );
    console.log("Admin promoted");
  }

  console.log("Email:", email);
  console.log("Password: Admin123!");
}

main()
  .catch((e) => { console.error("Failed:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
