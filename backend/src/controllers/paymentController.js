const { prisma } = require("../lib/prisma");

const PLATFORM_FEE_RATE = 0.2;

async function getAIConfigSafe() {
  try {
    const cfg = await prisma.aIConfig.findUnique({ where: { id: "default" } });
    return cfg || {};
  } catch {
    return {};
  }
}

async function getAdminId() {
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });
  return admin?.id;
}

exports.getBalance = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { balance: true },
    });
    res.json({ balance: user.balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deposit = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid deposit amount" });
    }

    const [user] = await prisma.$transaction([
      prisma.user.update({
        where: { id: req.user.userId },
        data: { balance: { increment: amount } },
      }),
      prisma.transaction.create({
        data: {
          amount,
          type: "DEPOSIT",
          fromUserId: req.user.userId,
          toUserId: req.user.userId,
          description: `Deposited ${amount} DZD`,
        },
      }),
    ]);

    res.json({ balance: user.balance, message: "Deposit successful" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { fromUserId: req.user.userId },
          { toUserId: req.user.userId },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.payOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { service: true },
    });

    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.userId !== req.user.userId) {
      return res.status(403).json({ message: "Not your order" });
    }
    if (order.paymentStatus !== "PENDING") {
      return res.status(400).json({ message: "Order already paid or cancelled" });
    }

    const amount = order.amount ?? order.service.price;

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (user.balance < amount) {
      return res.status(400).json({ message: "Insufficient balance. Please deposit first." });
    }

    const expertId = order.service.expertId;

    await prisma.$transaction([
      prisma.user.update({
        where: { id: req.user.userId },
        data: { balance: { decrement: amount } },
      }),
      prisma.order.update({
        where: { id },
        data: { paymentStatus: "HELD", amount },
      }),
      prisma.transaction.create({
        data: {
          amount,
          type: "HOLD",
          orderId: id,
          fromUserId: req.user.userId,
          toUserId: expertId,
          description: `Payment held for order`,
        },
      }),
    ]);

    res.json({ message: "Payment held successfully", paymentStatus: "HELD" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.confirmRelease = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { service: true },
    });

    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.userId !== req.user.userId) {
      return res.status(403).json({ message: "Not your order" });
    }
    if (order.paymentStatus !== "HELD") {
      return res.status(400).json({ message: "Order payment is not in held state" });
    }

    const amount = order.amount ?? order.service.price;
    const expertId = order.service.expertId;
    const expertPayout = Math.round(amount * (1 - PLATFORM_FEE_RATE) * 100) / 100;
    const platformFee = amount - expertPayout;
    const adminId = await getAdminId();

    await prisma.$transaction([
      prisma.user.update({
        where: { id: expertId },
        data: { balance: { increment: expertPayout } },
      }),
      prisma.order.update({
        where: { id },
        data: { paymentStatus: "RELEASED", status: "completed" },
      }),
      prisma.transaction.create({
        data: {
          amount: expertPayout,
          type: "RELEASE",
          orderId: id,
          fromUserId: req.user.userId,
          toUserId: expertId,
          description: `Payment released to expert (80%)`,
        },
      }),
      ...(adminId ? [prisma.transaction.create({
        data: {
          amount: platformFee,
          type: "PLATFORM_FEE",
          orderId: id,
          fromUserId: req.user.userId,
          toUserId: adminId,
          description: `20% platform commission`,
        },
      })] : []),
    ]);

    res.json({ message: "Payment released to expert", paymentStatus: "RELEASED" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Purchase AI Credits ──────────────────────────────────────────────────────

const AI_CREDIT_PRICE = 500; // DZD per credit

exports.purchaseAICredits = async (req, res) => {
  try {
    const { credits } = req.body;
    if (!credits || credits < 1 || credits > 100) {
      return res.status(400).json({ message: "Credits must be between 1 and 100" });
    }

    const config = await getAIConfigSafe();
    const creditPrice = config?.creditPrice || 500;
    const totalPrice = credits * creditPrice;

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { balance: true, aiCreditBalance: true },
    });

    if (!user || user.balance < totalPrice) {
      return res.status(400).json({
        message: `Insufficient balance. Need ${totalPrice} DZD, have ${user?.balance || 0} DZD.`,
        required: totalPrice,
        balance: user?.balance || 0,
      });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: req.user.userId },
        data: {
          balance: { decrement: totalPrice },
          aiCreditBalance: { increment: credits },
        },
      }),
      prisma.transaction.create({
        data: {
          amount: totalPrice,
          type: "AI_CREDIT_PURCHASE",
          fromUserId: req.user.userId,
          toUserId: req.user.userId,
          description: `Purchased ${credits} AI generation credit(s) for ${totalPrice} DZD`,
        },
      }),
    ]);

    const [updated] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { balance: true, aiCreditBalance: true, aiGenerationsUsed: true },
      }),
    ]);

    const aiCfg = await getAIConfigSafe();
    const freeLimit = aiCfg?.freeGenerations || 3;

    res.json({
      message: `Purchased ${credits} AI credit(s)`,
      credits,
      totalPrice,
      aiCreditBalance: updated.aiCreditBalance,
      balance: updated.balance,
      remaining: (freeLimit + updated.aiCreditBalance) - updated.aiGenerationsUsed,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Get AI Usage ──────────────────────────────────────────────────────────────

exports.getAIUsage = async (req, res) => {
  try {
    const [user] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { aiGenerationsUsed: true, aiCreditBalance: true },
      }),
    ]);

    const config = await getAIConfigSafe();
    const freeLimit = config?.freeGenerations || 3;

    res.json({
      used: user.aiGenerationsUsed,
      freeLimit,
      creditBalance: user.aiCreditBalance,
      totalAllowance: freeLimit + user.aiCreditBalance,
      remaining: (freeLimit + user.aiCreditBalance) - user.aiGenerationsUsed,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.userId !== req.user.userId) {
      return res.status(403).json({ message: "Not your order" });
    }
    if (order.paymentStatus !== "PENDING") {
      return res.status(400).json({ message: "Can only cancel pending orders. Contact admin for held orders." });
    }

    await prisma.order.update({
      where: { id },
      data: { status: "cancelled", paymentStatus: "CANCELLED" },
    });

    res.json({ message: "Order cancelled" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Admin endpoints ───

exports.getPlatformStats = async (req, res) => {
  try {
    const totalFees = await prisma.transaction.aggregate({
      where: { type: "PLATFORM_FEE" },
      _sum: { amount: true },
      _count: true,
    });

    const releasedOrders = await prisma.order.count({ where: { paymentStatus: "RELEASED" } });

    const monthlyFeesRaw = await prisma.$queryRaw`
      SELECT
        DATE_TRUNC('month', "createdAt") as month,
        SUM(amount) as total
      FROM "Transaction"
      WHERE type = 'PLATFORM_FEE'
      GROUP BY month
      ORDER BY month ASC
    `;

    const monthlyFees = monthlyFeesRaw.map((r) => ({
      month: r.month.toISOString().slice(0, 7),
      total: Number(r.total),
    }));

    res.json({
      totalPlatformFees: totalFees._sum.amount || 0,
      platformFeeCount: totalFees._count,
      releasedOrders,
      monthlyFees,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPlatformFeeTransactions = async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { type: "PLATFORM_FEE" },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        from: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
        order: { select: { amount: true, service: { select: { title: true } } } },
      },
    });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getHeldFunds = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { paymentStatus: "HELD" },
      include: {
        user: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
        service: {
          select: {
            title: true, price: true,
            expert: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.adminRelease = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { service: true },
    });

    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.paymentStatus !== "HELD") {
      return res.status(400).json({ message: "Order payment is not held" });
    }

    const amount = order.amount ?? order.service.price;
    const expertId = order.service.expertId;
    const expertPayout = Math.round(amount * (1 - PLATFORM_FEE_RATE) * 100) / 100;
    const platformFee = amount - expertPayout;
    const adminId = await getAdminId();

    await prisma.$transaction([
      prisma.user.update({
        where: { id: expertId },
        data: { balance: { increment: expertPayout } },
      }),
      prisma.order.update({
        where: { id },
        data: { paymentStatus: "RELEASED", status: "completed" },
      }),
      prisma.transaction.create({
        data: {
          amount: expertPayout,
          type: "RELEASE",
          orderId: id,
          fromUserId: order.userId,
          toUserId: expertId,
          description: `Admin released payment (80%)`,
        },
      }),
      ...(adminId ? [prisma.transaction.create({
        data: {
          amount: platformFee,
          type: "PLATFORM_FEE",
          orderId: id,
          fromUserId: order.userId,
          toUserId: adminId,
          description: `20% platform commission`,
        },
      })] : []),
    ]);

    res.json({ message: "Payment released by admin", paymentStatus: "RELEASED" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.adminRefund = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { service: true },
    });

    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.paymentStatus !== "HELD") {
      return res.status(400).json({ message: "Order payment is not held" });
    }

    const amount = order.amount ?? order.service.price;

    await prisma.$transaction([
      prisma.user.update({
        where: { id: order.userId },
        data: { balance: { increment: amount } },
      }),
      prisma.order.update({
        where: { id },
        data: { paymentStatus: "REFUNDED", status: "cancelled" },
      }),
      prisma.transaction.create({
        data: {
          amount,
          type: "REFUND",
          orderId: id,
          fromUserId: order.service.expertId,
          toUserId: order.userId,
          description: `Admin refunded payment for order`,
        },
      }),
    ]);

    res.json({ message: "Order refunded by admin", paymentStatus: "REFUNDED" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
