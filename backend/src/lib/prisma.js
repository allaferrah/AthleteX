const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function isConnErr(err) {
  const m = err?.message || "";
  return (
    m.includes("Can't reach database server") ||
    m.includes("connection") ||
    m.includes("timeout") ||
    m.includes("establish") ||
    m.includes("tenant/user") ||
    m.includes("not found") ||
    m.includes("FATAL")
  );
}

async function withRetry(fn, retries = 5, delay = 6000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1 || !isConnErr(err)) throw err;
      console.log(`[prisma] retry ${i + 1}/${retries} after ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

prisma.$use(async (params, next) => {
  for (let i = 0; i < 3; i++) {
    try {
      return await next(params);
    } catch (err) {
      if (i === 2 || !isConnErr(err)) throw err;
      console.log(`[prisma] query retry ${i + 1}/3 after 5s`);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
});

module.exports = { prisma, withRetry };
