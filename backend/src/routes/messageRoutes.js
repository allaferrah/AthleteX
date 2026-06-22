const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messageController");
const authMiddleware = require("../middleware/authMiddleware");

// Get all conversations
router.get("/conversations", authMiddleware, messageController.getConversations);

// Get messages with a specific user
router.get("/:partnerId", authMiddleware, messageController.getMessages);

// Send a message
router.post("/", authMiddleware, messageController.sendMessage);

module.exports = router;
