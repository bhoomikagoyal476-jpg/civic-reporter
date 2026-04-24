const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ================= DB =================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log(err));

/* ================= USER ================= */
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  locality: { type: String, required: true },
  trustScore: { type: Number, default: 50 }
});

const User = mongoose.model("User", userSchema);

/* ================= ISSUE ================= */
const issueSchema = new mongoose.Schema({
  title: String,
  location: String,
  image: String,
  verified: { type: Boolean, default: false },
  createdBy: String
});

const Issue = mongoose.model("Issue", issueSchema);

/* ================= ROOT ================= */
app.get("/", (req, res) => {
  res.json({ message: "Smart Civic API Working 🚀" });
});

/* ================= CREATE USER ================= */
app.get("/test-user", async (req, res) => {
  try {
    const user = await User.create({
      name: "Test User",
      email: `user${Date.now()}@test.com`,
      password: "123456",
      locality: "Chandigarh"
    });

    res.json({
      message: "User created",
      user
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= CREATE ISSUE ================= */
app.post("/issue", async (req, res) => {
  try {
    const issue = await Issue.create(req.body);

    res.json({
      message: "Issue created",
      issueId: issue._id,   // ⭐ IMPORTANT
      issue
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= VERIFY ISSUE ================= */
app.post("/verify/:id", async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({ error: "Issue not found" });
    }

    if (issue.verified) {
      return res.json({ message: "Already verified" });
    }

    issue.verified = true;
    await issue.save();

    // 🔥 GIVE POINTS TO USER
    const user = await User.findOne();
    if (user) {
      user.trustScore += 10;
      await user.save();
    }

    res.json({
      message: "Issue verified ✅ +10 points",
      issue,
      user
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
/* ================= GET ALL ISSUES ================= */
app.get("/issues", async (req, res) => {
  try {
    const issues = await Issue.find();
    res.json(issues);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= LEADERBOARD =================
app.get("/leaderboard", async (req, res) => {
  try {
    const users = await User.find()
      .sort({ trustScore: -1 })
      .limit(10); // 🔥 choose 5 or 10 (your choice)

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
/* ================= SERVER ================= */
app.listen(5000, () => {
  console.log("🚀 Server running on http://localhost:5000");
});