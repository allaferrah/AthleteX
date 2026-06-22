const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const uploadController = require("../controllers/uploadController");

router.post(
  "/",
  authMiddleware,
  uploadController.upload.single("file"),
  uploadController.uploadFile
);

router.post(
  "/multiple",
  authMiddleware,
  uploadController.upload.array("files", 10),
  uploadController.uploadMultiple
);

module.exports = router;
