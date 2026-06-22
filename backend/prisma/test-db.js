const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { prisma, withRetry } = require("../src/lib/prisma");

async function main() {
  console.log("Testing database connection...");
  const result = await withRetry(() => prisma.$queryRaw`SELECT 1 AS ok`, 5, 6000);
  console.log("Database alive:", JSON.stringify(result));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("DB test failed:", e.message);
  process.exit(1);
});
