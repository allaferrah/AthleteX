const { prisma } = require("../lib/prisma");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// REGISTER
exports.register = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const existing = await prisma.user.findUnique({
      where: { email }
    });

    if (existing) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: role === "EXPERT" ? "EXPERT" : "USER"
      }
    });

    res.json({ message: "User created", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({ message: "Wrong password" });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || "SECRET_KEY",
      { expiresIn: "7d" }
    );

    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};