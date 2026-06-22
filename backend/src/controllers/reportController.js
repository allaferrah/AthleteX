const { prisma } = require("../lib/prisma");

exports.createReport = async (req, res) => {
  try {
    const { reportedExpertId, reason, description } = req.body;
    const reporterId = req.user.userId;

    if (!reportedExpertId || !reason) {
      return res.status(400).json({ message: "reportedExpertId and reason are required" });
    }

    const expert = await prisma.user.findUnique({ where: { id: reportedExpertId } });
    if (!expert || expert.role !== "EXPERT") {
      return res.status(404).json({ message: "Expert not found" });
    }

    const report = await prisma.report.create({
      data: { reporterId, reportedExpertId, reason, description },
    });

    res.status(201).json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAllReports = async (req, res) => {
  try {
    const reports = await prisma.report.findMany({
      include: {
        reporter: { select: { id: true, email: true } },
        reportedExpert: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateReportStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["RESOLVED", "DISMISSED"].includes(status)) {
      return res.status(400).json({ message: "Status must be RESOLVED or DISMISSED" });
    }
    const report = await prisma.report.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
