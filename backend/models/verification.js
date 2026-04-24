const mongoose = require("mongoose");

const verificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  issue: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Issue",
    required: true
  },
  isValid: {
    type: Boolean,
    default: true
  },
  proofPhoto: {                    // ← Add this
    type: String,
    required: false
  },
  locationAtVerification: {        // ← Add this
    latitude: Number,
    longitude: Number
  }
}, { timestamps: true });

// ❗ Prevent same user verifying same issue twice
verificationSchema.index({ user: 1, issue: 1 }, { unique: true });

module.exports = mongoose.model("Verification", verificationSchema);