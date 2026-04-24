const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  locality: { type: String, required: true },

  trustScore: { type: Number, default: 50 },

  totalReports: { type: Number, default: 0 },
  correctReports: { type: Number, default: 0 },
  falseReports: { type: Number, default: 0 },

  totalVerifications: { type: Number, default: 0 },
  correctVerifications: { type: Number, default: 0 },

  badges: [{ name: String, earnedAt: Date, icon: String }],

  homeLocation: {
    lat: Number,
    lng: Number
  },

  dailyReportCount: { type: Number, default: 0 },
  lastReportDate: { type: Date, default: null },

  dailyVerificationCount: { type: Number, default: 0 },
  lastVerificationDate: { type: Date, default: null },

  isBanned: { type: Boolean, default: false },
  banReason: { type: String, default: null },
  suspensionUntil: { type: Date, default: null },

  helpfulVotes: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);