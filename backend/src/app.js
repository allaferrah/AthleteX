require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

app.use(cors());
app.use(express.json());

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

const authRoutes = require("./routes/authRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const orderRoutes = require("./routes/orderRoutes");
const aiRoutes = require("./routes/aiRoutes");
const profileRoutes = require("./routes/profileRoutes");
const messageRoutes = require("./routes/messageRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const adminRoutes = require("./routes/adminRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const reportRoutes = require("./routes/reportRoutes");
const sportCategoryRoutes = require("./routes/sportCategoryRoutes");
const turnRoutes = require("./routes/turnRoutes");

app.use("/api", turnRoutes);

app.use("/auth", authRoutes);
app.use("/services", serviceRoutes);
app.use("/orders", reviewRoutes);
app.use("/orders", orderRoutes);
app.use("/payments", paymentRoutes);
app.use("/reports", reportRoutes);
app.use("/sport-categories", sportCategoryRoutes);
app.use("/ai", aiRoutes);
app.use("/profile", profileRoutes);
app.use("/messages", messageRoutes);
app.use("/upload", uploadRoutes);
app.use("/admin", adminRoutes);

app.get("/", (req, res) => {
  res.send("AthleteX API running 🚀");
});

const initSocket = require("./socket");
initSocket(io);

const { prisma } = require("./lib/prisma");

// DB keep-alive — prevents Supabase cold-start
setInterval(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    // silent — next query will retry via middleware
  }
}, 45_000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
