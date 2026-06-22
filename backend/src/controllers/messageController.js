const { prisma } = require("../lib/prisma");

// GET all conversations for the logged-in user
// Returns unique conversation partners with last message
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get all messages where user is sender or receiver
    const messages = await prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      orderBy: { createdAt: "desc" },
      include: {
        sender: { select: { id: true, email: true, role: true } },
        receiver: { select: { id: true, email: true, role: true } },
      },
    });

    // Build unique conversation map
    const convMap = new Map();
    for (const msg of messages) {
      const partnerId =
        msg.senderId === userId ? msg.receiverId : msg.senderId;
      if (!convMap.has(partnerId)) {
        const partner =
          msg.senderId === userId ? msg.receiver : msg.sender;

        // Count unread messages from this partner
        const unreadCount = await prisma.message.count({
          where: {
            senderId: partnerId,
            receiverId: userId,
            read: false,
          },
        });

        convMap.set(partnerId, {
          partnerId,
          partnerEmail: partner.email,
          partnerRole: partner.role,
          lastMessage: msg.content,
          lastMessageAt: msg.createdAt,
          unreadCount,
        });
      }
    }

    res.json(Array.from(convMap.values()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET messages between logged-in user and a specific partner
exports.getMessages = async (req, res) => {
  try {
    const userId = req.user.userId;
    const partnerId = req.params.partnerId;

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: partnerId },
          { senderId: partnerId, receiverId: userId },
        ],
      },
      orderBy: { createdAt: "asc" },
      include: {
        sender: { select: { id: true, email: true } },
      },
    });

    // Mark messages from partner as read
    await prisma.message.updateMany({
      where: {
        senderId: partnerId,
        receiverId: userId,
        read: false,
      },
      data: { read: true },
    });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// SEND a message
exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, content, imageUrl } = req.body;

    if (!receiverId) {
      return res.status(400).json({ message: "receiverId is required" });
    }
    if (!content && !imageUrl) {
      return res.status(400).json({ message: "content or imageUrl is required" });
    }

    // Verify receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
    });

    if (!receiver) {
      return res.status(404).json({ message: "Receiver not found" });
    }

    const message = await prisma.message.create({
      data: {
        senderId: req.user.userId,
        receiverId,
        content: content || "",
        imageUrl: imageUrl || null,
      },
      include: {
        sender: { select: { id: true, email: true } },
      },
    });

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
