const { prisma } = require("../lib/prisma");

exports.getAll = async (req, res) => {
  try {
    const sports = await prisma.sportCategory.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { services: true } } },
    });
    res.json(sports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const sport = await prisma.sportCategory.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { services: true } } },
    });
    if (!sport) return res.status(404).json({ message: "Sport category not found" });
    res.json(sport);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, nameAr, icon, imageUrl, description, descriptionAr, sortOrder } = req.body;
    const sport = await prisma.sportCategory.create({
      data: { name, nameAr, icon, imageUrl: imageUrl || null, description, descriptionAr, sortOrder: sortOrder ?? 0 },
    });
    res.status(201).json(sport);
  } catch (err) {
    if (err.code === "P2002") return res.status(400).json({ message: "Sport category with this name already exists" });
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { name, nameAr, icon, imageUrl, description, descriptionAr, sortOrder } = req.body;
    const sport = await prisma.sportCategory.update({
      where: { id: req.params.id },
      data: { name, nameAr, icon, imageUrl: imageUrl || null, description, descriptionAr, sortOrder },
    });
    res.json(sport);
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ message: "Sport category not found" });
    if (err.code === "P2002") return res.status(400).json({ message: "Sport category with this name already exists" });
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const count = await prisma.service.count({ where: { sportId: req.params.id } });
    if (count > 0) {
      return res.status(400).json({ message: `Cannot delete: ${count} service(s) are linked to this sport` });
    }
    await prisma.sportCategory.delete({ where: { id: req.params.id } });
    res.json({ message: "Sport category deleted" });
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ message: "Sport category not found" });
    res.status(500).json({ error: err.message });
  }
};
