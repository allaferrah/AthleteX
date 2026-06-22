const { prisma } = require("../lib/prisma");
const cache = require("../lib/cache");
const bcrypt = require("bcrypt");

const CACHE_TTL = 15_000;

exports.getStats = async (req, res) => {
  try {
    const cached = cache.get("admin:stats");
    if (cached) return res.json(cached);

    const users = await prisma.user.count({ where: { role: "USER" } });
    const experts = await prisma.user.count({ where: { role: "EXPERT" } });
    const services = await prisma.service.count();
    const orders = await prisma.order.count();
    const admins = await prisma.user.count({ where: { role: "ADMIN" } });
    const platformFees = await prisma.transaction.aggregate({
      where: { type: "PLATFORM_FEE" },
      _sum: { amount: true },
    });
    const pendingOrders = await prisma.order.count({ where: { status: "pending" } });

    const result = { users, experts, services, orders, pendingOrders, admins, platformFees: platformFees._sum.amount || 0 };
    cache.set("admin:stats", result, CACHE_TTL);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const cached = cache.get("admin:users");
    if (cached) return res.json(cached);

    const users = await prisma.user.findMany({
      select: {
        id: true, email: true, role: true, createdAt: true,
        profile: { select: { fullName: true, photoUrl: true, specialization: true } },
        _count: { select: { services: true, orders: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    cache.set("admin:users", users, CACHE_TTL);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAllServices = async (req, res) => {
  try {
    const cached = cache.get("admin:services");
    if (cached) return res.json(cached);

    const services = await prisma.service.findMany({
      include: {
        expert: { select: { email: true, profile: { select: { fullName: true } } } },
        _count: { select: { orders: true, reviews: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    cache.set("admin:services", services, CACHE_TTL);
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteService = async (req, res) => {
  try {
    const service = await prisma.service.findUnique({ where: { id: req.params.id } });
    if (!service) return res.status(404).json({ message: "Service not found" });
    await prisma.$transaction([
      prisma.review.deleteMany({ where: { serviceId: req.params.id } }),
      prisma.order.deleteMany({ where: { serviceId: req.params.id } }),
      prisma.service.delete({ where: { id: req.params.id } }),
    ]);
    cache.del("admin:");
    res.json({ message: "Service deleted with all related orders and reviews" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateService = async (req, res) => {
  try {
    const { title, description, price, category, sportId } = req.body;
    const service = await prisma.service.findUnique({ where: { id: req.params.id } });
    if (!service) return res.status(404).json({ message: "Service not found" });
    const updated = await prisma.service.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: Number(price) }),
        ...(category !== undefined && { category }),
        ...(sportId !== undefined && { sportId: sportId || null }),
      },
    });
    cache.del("admin:");
    res.json({ message: "Service updated", service: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!["USER", "EXPERT", "ADMIN"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, email: true, role: true },
    });
    cache.del("admin:");
    res.json({ message: "Role updated", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "ADMIN") return res.status(403).json({ message: "Cannot delete admin" });
    await prisma.user.delete({ where: { id: req.params.id } });
    cache.del("admin:");
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getFlaggedExperts = async (req, res) => {
  try {
    const cached = cache.get("admin:flagged");
    if (cached) return res.json(cached);

    const experts = await prisma.user.findMany({
      where: { role: "EXPERT", oneStarCount: { gte: 10 } },
      select: {
        id: true, email: true, oneStarCount: true, averageRating: true,
        totalReviews: true, isSuspended: true,
        profile: { select: { fullName: true, photoUrl: true, specialization: true } },
      },
      orderBy: { oneStarCount: "desc" },
    });
    cache.set("admin:flagged", experts, CACHE_TTL);
    res.json(experts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.suspendExpert = async (req, res) => {
  try {
    const expert = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!expert || expert.role !== "EXPERT") return res.status(404).json({ message: "Expert not found" });
    await prisma.user.update({ where: { id: req.params.id }, data: { isSuspended: true } });
    cache.del("admin:");
    res.json({ message: "Expert suspended" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.unsuspendExpert = async (req, res) => {
  try {
    const expert = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!expert || expert.role !== "EXPERT") return res.status(404).json({ message: "Expert not found" });
    await prisma.user.update({ where: { id: req.params.id }, data: { isSuspended: false } });
    cache.del("admin:");
    res.json({ message: "Expert unsuspended" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createExpert = async (req, res) => {
  try {
    const { email, password, fullName, specialization } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ message: "User already exists" });
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashed, role: "EXPERT" },
    });
    await prisma.profile.create({
      data: { userId: user.id, fullName, specialization },
    });
    cache.del("admin:");
    res.status(201).json({ message: "Expert created", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Order Management ───────────────────────────────────────────────────────────

exports.getAllOrders = async (req, res) => {
  try {
    const cached = cache.get("admin:orders");
    if (cached) return res.json(cached);

    const orders = await prisma.order.findMany({
      include: {
        user: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
        service: {
          select: {
            id: true, title: true, price: true,
            expert: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
          },
        },
        reviews: { select: { id: true, rating: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    cache.set("admin:orders", orders, CACHE_TTL);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateOrder = async (req, res) => {
  try {
    const { status, paymentStatus } = req.body;
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ message: "Order not found" });
    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: { ...(status !== undefined && { status }), ...(paymentStatus !== undefined && { paymentStatus }) },
    });
    cache.del("admin:");
    res.json({ message: "Order updated", order: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ message: "Order not found" });
    await prisma.$transaction([
      prisma.review.deleteMany({ where: { orderId: req.params.id } }),
      prisma.transaction.deleteMany({ where: { orderId: req.params.id } }),
      prisma.order.delete({ where: { id: req.params.id } }),
    ]);
    cache.del("admin:");
    res.json({ message: "Order deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Review Management ─────────────────────────────────────────────────────────

exports.getAllReviews = async (req, res) => {
  try {
    const cached = cache.get("admin:reviews");
    if (cached) return res.json(cached);

    const reviews = await prisma.review.findMany({
      include: {
        user: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
        service: { select: { id: true, title: true } },
      },
      orderBy: { id: "desc" },
    });
    cache.set("admin:reviews", reviews, CACHE_TTL);
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const review = await prisma.review.findUnique({ where: { id: req.params.id } });
    if (!review) return res.status(404).json({ message: "Review not found" });
    await prisma.review.delete({ where: { id: req.params.id } });
    cache.del("admin:");
    res.json({ message: "Review deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── AI Config ──────────────────────────────────────────────────────────────────

exports.getAIConfig = async (req, res) => {
  try {
    const cached = cache.get("admin:ai-config");
    if (cached) return res.json(cached);

    let config = await prisma.aIConfig.findUnique({ where: { id: "default" } });
    if (!config) {
      config = await prisma.aIConfig.create({
        data: { id: "default", creditPrice: 500, freeGenerations: 3 },
      });
    }
    cache.set("admin:ai-config", config, CACHE_TTL);
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateAIConfig = async (req, res) => {
  try {
    const { creditPrice, freeGenerations } = req.body;
    const data = {};
    if (creditPrice !== undefined) data.creditPrice = creditPrice;
    if (freeGenerations !== undefined) data.freeGenerations = freeGenerations;
    const config = await prisma.aIConfig.upsert({
      where: { id: "default" },
      update: data,
      create: { id: "default", creditPrice: creditPrice || 500, freeGenerations: freeGenerations || 3 },
    });
    cache.del("admin:");
    res.json({ message: "AI config updated", config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAIUsers = async (req, res) => {
  try {
    const cached = cache.get("admin:ai-users");
    if (cached) return res.json(cached);

    const users = await prisma.user.findMany({
      where: { role: { not: "ADMIN" } },
      select: {
        id: true, email: true, aiGenerationsUsed: true, aiGenerationsLimit: true,
        aiCreditBalance: true, profile: { select: { fullName: true } }, createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const userIds = users.map((u) => u.id);
    const spendData = await prisma.transaction.groupBy({
      by: ["fromUserId"],
      where: { type: "AI_CREDIT_PURCHASE", fromUserId: { in: userIds } },
      _sum: { amount: true },
    });
    const spendMap = {};
    for (const s of spendData) spendMap[s.fromUserId] = s._sum.amount || 0;

    const result = users.map((u) => ({
      id: u.id, email: u.email, fullName: u.profile?.fullName || null,
      aiGenerationsUsed: u.aiGenerationsUsed, aiGenerationsLimit: u.aiGenerationsLimit,
      aiCreditBalance: u.aiCreditBalance, totalSpent: spendMap[u.id] || 0,
    }));

    cache.set("admin:ai-users", result, CACHE_TTL);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
