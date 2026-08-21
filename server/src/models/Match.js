const mongoose = require("mongoose");

const matchSchema = new mongoose.Schema(
  {
    day: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Day",
      required: true,
    },

    teamA: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Player",
        required: true,
      },
    ],

    teamB: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Player",
        required: true,
      },
    ],

    scoreA: {
      type: Number,
      default: null,
    },

    scoreB: {
      type: Number,
      default: null,
    },

    winner: {
      type: String,
      enum: ["A", "B", null],
      default: null,
    },

    stakePerPlayer: {
      type: Number,
      default: 5,
    },

    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Match", matchSchema);