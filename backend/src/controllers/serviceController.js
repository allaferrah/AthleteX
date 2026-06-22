const { prisma } = require("../lib/prisma");

exports.createService = async (req, res) => {
  try {
    if (req.user.role !== "EXPERT" && req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only experts can create services." });
    }

    const { title, description, price, imageUrl, category, sportId } = req.body;

    const service = await prisma.service.create({
      data: {
        title,
        description,
        price: Number(price),
        imageUrl: imageUrl || null,
        category: category || "NUTRITION",
        sportId: sportId || null,
        expertId: req.user.userId,
      },
      include: {
        expert: {
          select: { email: true, profile: { select: { fullName: true, photoUrl: true, specialization: true } } },
        },
        sport: true,
      },
    });

    res.status(201).json({ message: "Service created successfully", service });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAllServices = async (req, res) => {
  try {
    const { category, sportId } = req.query;
    const where = {};
    if (category) where.category = category.toUpperCase();
    if (sportId) where.sportId = sportId;

    const services = await prisma.service.findMany({
      where,
      include: {
        expert: {
          select: {
            email: true,
            isSuspended: true,
            averageRating: true,
            totalReviews: true,
            oneStarCount: true,
            profile: {
              select: { fullName: true, photoUrl: true, specialization: true, yearsExperience: true },
            },
          },
        },
        reviews: { select: { rating: true } },
        sport: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const result = services.map((s) => ({
      ...s,
      averageRating: s.reviews.length > 0
        ? s.reviews.reduce((sum, r) => sum + r.rating, 0) / s.reviews.length
        : 0,
      reviewCount: s.reviews.length,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMyServices = async (req, res) => {
  try {
    if (req.user.role !== "EXPERT" && req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only experts can access this." });
    }

    const services = await prisma.service.findMany({
      where: { expertId: req.user.userId },
      include: {
        expert: {
          select: {
            email: true,
            profile: {
              select: { fullName: true, photoUrl: true },
            },
          },
        },
        sport: { select: { id: true, name: true, nameAr: true, icon: true } },
        _count: { select: { orders: true, reviews: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateService = async (req, res) => {
  try {
    const service = await prisma.service.findUnique({ where: { id: req.params.id } });
    if (!service) return res.status(404).json({ message: "Service not found" });
    if (service.expertId !== req.user.userId && req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { title, description, price, imageUrl, category, sportId } = req.body;
    const updated = await prisma.service.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: Number(price) }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(category !== undefined && { category }),
        ...(sportId !== undefined && { sportId: sportId || null }),
      },
      include: {
        expert: {
          select: { email: true, profile: { select: { fullName: true, photoUrl: true, specialization: true } } },
        },
        sport: true,
      },
    });
    res.json({ message: "Service updated successfully", service: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteService = async (req, res) => {
  try {
    const service = await prisma.service.findUnique({ where: { id: req.params.id } });
    if (!service) return res.status(404).json({ message: "Service not found" });
    if (service.expertId !== req.user.userId && req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Not authorized" });
    }
    await prisma.service.delete({ where: { id: req.params.id } });
    res.json({ message: "Service deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getServiceById = async (req, res) => {
  try {
    const service = await prisma.service.findUnique({
      where: { id: req.params.id },
      include: {
        expert: {
          select: {
            id: true,
            email: true,
            isSuspended: true,
            averageRating: true,
            totalReviews: true,
            oneStarCount: true,
            profile: {
              select: {
                fullName: true,
                photoUrl: true,
                specialization: true,
                bio: true,
                yearsExperience: true,
                achievements: true,
                certifications: true,
                portfolioPhotos: true,
              },
            },
          },
        },
        reviews: {
          include: {
            user: { select: { email: true } },
          },
        },
        sport: true,
      },
    });

    if (!service) return res.status(404).json({ message: "Service not found" });

    const totalRating = service.reviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = service.reviews.length > 0 ? totalRating / service.reviews.length : 0;

    res.json({ ...service, averageRating: avgRating });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
