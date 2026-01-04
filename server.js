const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const authRouter = require("./routes/auth");
const usersRouter = require("./routes/users");
const recordsRouter = require("./routes/records");
const registerRouter = require("./routes/register");
const searchRouter = require("./routes/search");
const profileRouter = require("./routes/profile");
const flRouter = require("./routes/federatedLearning");

const app = express();

// ✅ CORS setup
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
  })
);

app.use(express.json());

// ✅ Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", environment: process.env.NODE_ENV || "development", timestamp: Date.now() });
});

// ✅ API routes
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/records", recordsRouter);
app.use("/api/register", registerRouter);
app.use("/api/search", searchRouter);
app.use("/api/profile", profileRouter);
app.use("/api/fl", flRouter);

const port = process.env.PORT || 5001;
app.listen(port, () => {
  console.log(`🚀 HealthLedger API Gateway running on port ${port}`);
  console.log(`👉 API Base Path: http://localhost:${port}/api`);
});
