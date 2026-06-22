const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const authMiddleware = require("../middleware/authMiddleware");

const adminOnly = (req, res, next) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ message: "Admin only" });
  next();
};

router.use(authMiddleware, adminOnly);

router.get("/stats", adminController.getStats);
router.get("/users", adminController.getAllUsers);
router.get("/services", adminController.getAllServices);
router.delete("/services/:id", adminController.deleteService);
router.patch("/services/:id", adminController.updateService);
router.patch("/users/:id/role", adminController.updateUserRole);
router.delete("/users/:id", adminController.deleteUser);
router.post("/experts", adminController.createExpert);
router.get("/flagged-experts", adminController.getFlaggedExperts);
router.post("/experts/:id/suspend", adminController.suspendExpert);
router.post("/experts/:id/unsuspend", adminController.unsuspendExpert);

// Order management
router.get("/orders", adminController.getAllOrders);
router.patch("/orders/:id", adminController.updateOrder);
router.delete("/orders/:id", adminController.deleteOrder);

// Review management
router.get("/reviews", adminController.getAllReviews);
router.delete("/reviews/:id", adminController.deleteReview);

// AI Subscription management
router.get("/ai-config", adminController.getAIConfig);
router.put("/ai-config", adminController.updateAIConfig);
router.get("/ai-users", adminController.getAIUsers);

module.exports = router;
