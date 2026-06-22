const express = require("express");
const router = express.Router();
const serviceController = require("../controllers/serviceController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/", authMiddleware, serviceController.createService);
router.get("/", serviceController.getAllServices);
router.get("/me", authMiddleware, serviceController.getMyServices);
router.put("/:id", authMiddleware, serviceController.updateService);
router.delete("/:id", authMiddleware, serviceController.deleteService);
router.get("/:id", serviceController.getServiceById);

module.exports = router;
