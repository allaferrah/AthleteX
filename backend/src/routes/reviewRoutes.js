const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/reviewController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/:id/review", authMiddleware, reviewController.createReview);
router.get("/:id/review", authMiddleware, reviewController.getOrderReview);

module.exports = router;
