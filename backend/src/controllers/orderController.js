const { prisma } = require("../lib/prisma");

exports.createOrder = async (req, res) => {
  try {
    const { serviceId } = req.body;

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: { expert: { select: { id: true } } },
    });

    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    const order = await prisma.order.create({
      data: {
        userId: req.user.userId,
        serviceId,
        amount: service.price,
      },
      include: {
        service: { select: { title: true, expertId: true } },
      },
    });

    // Auto-send an initial message to start the conversation
    await prisma.message.create({
      data: {
        senderId: req.user.userId,
        receiverId: service.expert.id,
        content: `Hi! I just ordered your service "${service.title}". I'm excited to get started!`,
      },
    });

    res.status(201).json({ message: "Order placed successfully! Start chatting with your expert.", order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getUserOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.userId },
      include: {
        service: {
          include: {
            expert: {
              select: { id: true, email: true, profile: { select: { fullName: true, photoUrl: true } } },
            },
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

exports.getExpertOrders = async (req, res) => {
  try {
    if (req.user.role !== "EXPERT" && req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only experts can view received orders." });
    }

    const orders = await prisma.order.findMany({
      where: { service: { expertId: req.user.userId } },
      include: {
        service: { select: { id: true, title: true, price: true, imageUrl: true, category: true } },
        user: { select: { id: true, email: true, profile: { select: { fullName: true, photoUrl: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
