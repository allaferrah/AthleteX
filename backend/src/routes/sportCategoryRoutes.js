const express = require("express");
const router = express.Router();
const sportCategoryController = require("../controllers/sportCategoryController");
const authMiddleware = require("../middleware/authMiddleware");

const adminOnly = (req, res, next) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ message: "Admin only" });
  next();
};

router.get("/", sportCategoryController.getAll);
router.get("/:id", sportCategoryController.getById);
router.post("/", authMiddleware, adminOnly, sportCategoryController.create);
router.put("/:id", authMiddleware, adminOnly, sportCategoryController.update);
router.delete("/:id", authMiddleware, adminOnly, sportCategoryController.remove);

module.exports = router;
