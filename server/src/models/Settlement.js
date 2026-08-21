const mongoose = require("mongoose");

const settlementEntrySchema = new mongoose.Schema(
  {
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Player",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
    },

    paidAt: {
      type: Date,
      default: null,
    },

    proofUrl: {
      type: String,
      default: null,
    },

    transactionId: {
      type: String,
      default: null,
    },
  },
  { _id: true }
);

const settlementSchema = new mongoose.Schema(
  {
    day: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Day",
      required: true,
      unique: true,
    },

    entries: [settlementEntrySchema],

    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Settlement", settlementSchema);