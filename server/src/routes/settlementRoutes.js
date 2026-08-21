const express = require("express");
const Match = require("../models/Match");
const Day = require("../models/Day");
const Settlement = require("../models/Settlement");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const BET_AMOUNT = 5;

// ============================================================
// GET CURRENT BALANCE FOR A DAY
// ============================================================
router.get("/day/:dayId", protect, async (req, res) => {
  try {
    const day = await Day.findById(req.params.dayId);

    if (!day) {
      return res.status(404).json({
        message: "Day not found",
      });
    }

    const matches = await Match.find({
      day: day._id,
      winner: { $ne: null },
    });

    const balances = {};

    for (const match of matches) {
      const winningTeam =
        match.winner === "A"
          ? match.teamA
          : match.teamB;

      const losingTeam =
        match.winner === "A"
          ? match.teamB
          : match.teamA;

      for (const playerId of winningTeam) {
        const id = playerId.toString();

        if (!balances[id]) {
          balances[id] = 0;
        }

        balances[id] += BET_AMOUNT;
      }

      for (const playerId of losingTeam) {
        const id = playerId.toString();

        if (!balances[id]) {
          balances[id] = 0;
        }

        balances[id] -= BET_AMOUNT;
      }
    }

    // Get player names
    const playerIds = Object.keys(balances);

    const populatedMatches = await Match.find({
      day: day._id,
      winner: { $ne: null },
    })
      .populate("teamA", "name")
      .populate("teamB", "name");

    const playerMap = {};

    for (const match of populatedMatches) {
      for (const player of [
        ...match.teamA,
        ...match.teamB,
      ]) {
        playerMap[player._id.toString()] = player.name;
      }
    }

    const playerBalances = Object.entries(balances)
      .map(([playerId, amount]) => ({
        playerId,
        playerName: playerMap[playerId] || "Unknown",
        amount,
      }))
      .sort((a, b) => a.playerName.localeCompare(b.playerName));

    res.json({
      dayId: day._id,
      status: day.status,
      matchesPlayed: matches.length,
      betAmount: BET_AMOUNT,
      balances: playerBalances,
    });
  } catch (error) {
    console.error("Get balance error:", error);

    res.status(500).json({
      message: "Failed to calculate daily balance",
      error: error.message,
    });
  }
});

// ============================================================
// GET FINAL SETTLEMENT FOR A DAY
// ============================================================
router.get(
  "/day/:dayId/final",
  protect,
  async (req, res) => {
    try {
      const settlement = await Settlement.findOne({
        day: req.params.dayId,
      })
        .populate("day")
        .populate("entries.player", "name");

      if (!settlement) {
        return res.status(404).json({
          message: "Settlement not found",
        });
      }

      res.json(settlement);
    } catch (error) {
      console.error(
        "Get final settlement error:",
        error
      );

      res.status(500).json({
        message: "Failed to get settlement",
        error: error.message,
      });
    }
  }
);

// ============================================================
// GET ALL SETTLEMENTS
// ============================================================
router.get("/", protect, async (req, res) => {
  try {
    const settlements = await Settlement.find()
      .populate("day")
      .populate("entries.player", "name")
      .sort({ createdAt: -1 });

    res.json(settlements);
  } catch (error) {
    console.error(
      "Get settlements error:",
      error
    );

    res.status(500).json({
      message: "Failed to get settlements",
      error: error.message,
    });
  }
});

// ============================================================
// GET SINGLE SETTLEMENT
// ============================================================
router.get("/:id", protect, async (req, res) => {
  try {
    const settlement = await Settlement.findById(
      req.params.id
    )
      .populate("day")
      .populate("entries.player", "name");

    if (!settlement) {
      return res.status(404).json({
        message: "Settlement not found",
      });
    }

    res.json(settlement);
  } catch (error) {
    console.error(
      "Get settlement error:",
      error
    );

    res.status(500).json({
      message: "Failed to get settlement",
      error: error.message,
    });
  }
});

module.exports = router;