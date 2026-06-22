const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");
const authMiddleware = require("../middleware/authMiddleware");

const adminOnly = (req, res, next) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ message: "Admin only" });
  next();
};

router.post("/", authMiddleware, reportController.createReport);
router.get("/", authMiddleware, adminOnly, reportController.getAllReports);
router.patch("/:id", authMiddleware, adminOnly, reportController.updateReportStatus);

module.exports = router;
