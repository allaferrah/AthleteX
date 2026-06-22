const { prisma } = require("../lib/prisma");

// GET my profile (or create default one)
exports.getMyProfile = async (req, res) => {
  try {
    let profile = await prisma.profile.findUnique({
      where: { userId: req.user.userId },
    });

    if (!profile) {
      profile = await prisma.profile.create({
        data: { userId: req.user.userId },
      });
    }

    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET expert profile by userId (public)
exports.getExpertProfile = async (req, res) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.params.userId },
      include: {
        user: {
          select: { email: true, role: true, createdAt: true },
        },
      },
    });

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE my profile
exports.updateProfile = async (req, res) => {
  try {
    const {
      fullName,
      bio,
      specialization,
      phone,
      photoUrl,
      portfolioPhotos,
      achievements,
      certifications,
      yearsExperience,
      weight,
      height,
      goal,
    } = req.body;

    // Upsert: create if not exists, update if exists
    const profile = await prisma.profile.upsert({
      where: { userId: req.user.userId },
      update: {
        fullName,
        bio,
        specialization,
        phone,
        photoUrl,
        portfolioPhotos,
        achievements,
        certifications,
        yearsExperience: yearsExperience ? Number(yearsExperience) : null,
        weight: weight ? Number(weight) : null,
        height: height ? Number(height) : null,
        goal,
      },
      create: {
        userId: req.user.userId,
        fullName,
        bio,
        specialization,
        phone,
        photoUrl,
        portfolioPhotos: portfolioPhotos || [],
        achievements: achievements || [],
        certifications: certifications || [],
        yearsExperience: yearsExperience ? Number(yearsExperience) : null,
        weight: weight ? Number(weight) : null,
        height: height ? Number(height) : null,
        goal,
      },
    });

    res.json({ message: "Profile updated successfully", profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
