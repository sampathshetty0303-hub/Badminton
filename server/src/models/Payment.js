const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    settlement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Settlement",
      required: true,
    },

    fromPlayer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Player",
      required: true,
    },

    toPlayer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Player",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    status: {
      type: String,
      enum: ["pending", "submitted", "verified"],
      default: "pending",
    },

    transactionId: {
      type: String,
      default: null,
      trim: true,
    },

    proofUrl: {
      type: String,
      default: null,
    },

    submittedAt: {
      type: Date,
      default: null,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Payment", paymentSchema);