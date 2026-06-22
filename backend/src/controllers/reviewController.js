const { prisma } = require("../lib/prisma");

exports.createReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const { id } = req.params;
    const userId = req.user.userId;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { service: true },
    });

    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.userId !== userId) return res.status(403).json({ message: "Not your order" });
    if (order.status !== "completed" || order.paymentStatus !== "RELEASED") {
      return res.status(400).json({ message: "Order must be completed and payment released to review" });
    }

    const existing = await prisma.review.findFirst({ where: { orderId: id } });
    if (existing) return res.status(400).json({ message: "Already reviewed this order" });

    const review = await prisma.review.create({
      data: { rating, comment, userId, serviceId: order.serviceId, orderId: id },
    });

    // Update expert rating stats
    const allReviews = await prisma.review.findMany({
      where: { serviceId: order.serviceId },
      select: { rating: true },
    });
    const totalReviews = allReviews.length;
    const averageRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;
    const oneStarCount = allReviews.filter((r) => r.rating === 1).length;

    await prisma.user.update({
      where: { id: order.service.expertId },
      data: { totalReviews, averageRating, oneStarCount },
    });

    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOrderReview = async (req, res) => {
  try {
    const review = await prisma.review.findFirst({
      where: { orderId: req.params.id },
    });
    res.json(review);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
