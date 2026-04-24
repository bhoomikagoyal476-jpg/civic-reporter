const mongoose = require("mongoose");

const issueSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },

  description: {
    type: String,
    required: true
  },

  // ✅ ENHANCED LOCATION (adds locality for hyperlocal grouping)
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    address: { type: String, required: true },
    locality: { type: String, required: true }  // 🔥 NEW: For hyperlocal grouping
  },

  // ✅ ENHANCED IMAGES
  images: [String],
  
  // 🔥 NEW: Main photo (required for reporting)
  mainPhoto: { type: String, required: true },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  // ✅ ENHANCED VERIFICATION SYSTEM (Keep old + add new)
  verifications: {
    type: Number,
    default: 0
  },

  verifiedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],

  // 🔥 NEW: Multi-layer verification with photo proof
  verificationDetails: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    photoUrl: { type: String, required: true },  // Mandatory photo re-upload
    comment: String,
    verifiedAt: { type: Date, default: Date.now }
  }],

  // 🔥 NEW: Required verifications based on reporter's trust score
  requiredVerifications: { type: Number, default: 3 },  // Changes based on trust

  // ✅ KEEP YOUR PRIORITY (but enhance logic)
  priority: {
    type: String,
    enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL", "EMERGENCY"],  // Added EMERGENCY
    default: "LOW"
  },

  // ✅ KEEP YOUR STATUS (but enhance)
  status: {
    type: String,
    enum: ["OPEN", "PENDING_VERIFICATION", "VERIFIED", "IN_PROGRESS", "RESOLVED", "REJECTED"],
    default: "OPEN"
  },

  // 🔥 NEW: For escalation tracking
  priorityEscalatedAt: Date,
  
  // 🔥 NEW: Resolution tracking
  resolvedAt: Date,
  resolutionNote: String,

  // 🔥 NEW: Category (for intelligent routing)
  category: {
    type: String,
    enum: ["pothole", "garbage", "water_leakage", "streetlight", "drainage", "other"],
    default: "other"
  }

}, { timestamps: true });

// 🔥 NEW: Index for hyperlocal queries
issueSchema.index({ "location.locality": 1, status: 1 });
issueSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Issue", issueSchema);