const { prisma } = require("../lib/prisma");

async function getAIConfigSafe() {
  try {
    const cfg = await prisma.aIConfig.findUnique({ where: { id: "default" } });
    return cfg || {};
  } catch {
    return {};
  }
}

module.exports = async (req, res, next) => {
  try {
    const [user] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { aiGenerationsUsed: true, aiCreditBalance: true, role: true },
      }),
    ]);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.role === "ADMIN") return next();

    const config = await getAIConfigSafe();
    const freeLimit = config?.freeGenerations || 3;
    const totalAllowance = freeLimit + user.aiCreditBalance;

    if (user.aiGenerationsUsed >= totalAllowance) {
      return res.status(402).json({
        error: "AI generation limit reached",
        message: "You have used all your free AI generations. Purchase more credits to continue.",
        used: user.aiGenerationsUsed,
        freeLimit,
        creditBalance: user.aiCreditBalance,
      });
    }

    next();
  } catch (err) {
    console.error("AI usage limit check error:", err);
    res.status(500).json({ error: err.message });
  }
};
