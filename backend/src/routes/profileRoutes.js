const express = require("express");
const router = express.Router();
const profileController = require("../controllers/profileController");
const authMiddleware = require("../middleware/authMiddleware");

// Get my own profile
router.get("/me", authMiddleware, profileController.getMyProfile);

// Update my profile
router.put("/me", authMiddleware, profileController.updateProfile);

// Get any expert's public profile
router.get("/:userId", profileController.getExpertProfile);

module.exports = router;
