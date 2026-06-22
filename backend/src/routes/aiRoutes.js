const express = require("express");
const router = express.Router();
const aiController = require("../controllers/aiController");
const authMiddleware = require("../middleware/authMiddleware");
const aiUsageLimit = require("../middleware/aiUsageLimit");

router.post("/plan", authMiddleware, aiUsageLimit, aiController.generatePlan);
router.get("/plans", authMiddleware, aiController.getPlans);
router.get("/plans/:id", authMiddleware, aiController.getPlan);
router.post("/plans", authMiddleware, aiController.savePlan);
router.put("/plans/:id", authMiddleware, aiController.updatePlan);
router.delete("/plans/:id", authMiddleware, aiController.deletePlan);
router.get("/config", aiController.getConfig);

module.exports = router;
