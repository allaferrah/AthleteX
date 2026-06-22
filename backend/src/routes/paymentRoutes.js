const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");

const adminOnly = (req, res, next) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ message: "Admin only" });
  next();
};
const {
  getBalance,
  deposit,
  getTransactions,
  payOrder,
  confirmRelease,
  cancelOrder,
  getHeldFunds,
  adminRelease,
  adminRefund,
  getPlatformStats,
  getPlatformFeeTransactions,
  purchaseAICredits,
  getAIUsage,
} = require("../controllers/paymentController");

// User routes
router.get("/balance", auth, getBalance);
router.post("/deposit", auth, deposit);
router.get("/transactions", auth, getTransactions);

// AI credits
router.post("/ai-credits", auth, purchaseAICredits);
router.get("/ai-usage", auth, getAIUsage);

// Order payment routes
router.post("/orders/:id/pay", auth, payOrder);
router.post("/orders/:id/confirm-release", auth, confirmRelease);
router.post("/orders/:id/cancel", auth, cancelOrder);

// Admin routes
router.get("/admin/held-funds", auth, adminOnly, getHeldFunds);
router.post("/admin/orders/:id/release", auth, adminOnly, adminRelease);
router.post("/admin/orders/:id/refund", auth, adminOnly, adminRefund);
router.get("/platform-stats", auth, adminOnly, getPlatformStats);
router.get("/platform-fees", auth, adminOnly, getPlatformFeeTransactions);

module.exports = router;
