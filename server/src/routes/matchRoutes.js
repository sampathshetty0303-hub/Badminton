const express = require("express");

const Match = require("../models/Match");
const Day = require("../models/Day");
const Player = require("../models/Player");

const {
  protect,
  adminOnly,
} = require("../middleware/authMiddleware");

const router = express.Router();

// ============================================================
// GET MATCH HISTORY - LOGGED-IN USERS
// ============================================================

router.get("/", protect, async (req, res) => {
  try {
    const matches = await Match.find()
      .populate("day", "date status")
      .populate("teamA", "name")
      .populate("teamB", "name")
      .sort({ createdAt: -1 });

    res.json(matches);
  } catch (error) {
    console.error("Get match history error:", error);
    res.status(500).json({ message: "Failed to load match history." });
  }
});

// ============================================================
// GET MATCHES FOR A DAY
// ============================================================

router.get("/day/:dayId", protect, async (req, res) => {
  try {
    const matches = await Match.find({
      day: req.params.dayId,
    })
      .populate("teamA", "name")
      .populate("teamB", "name")
      .sort({ createdAt: 1 });

    res.json(matches);
  } catch (error) {
    console.error("Get matches error:", error);

    res.status(500).json({
      message: "Failed to load matches.",
    });
  }
});

// ============================================================
// GENERATE RANDOM TEAMS (NEW)
// ============================================================

router.post(
  "/random",
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const { dayId } = req.body;

      if (!dayId) {
        return res.status(400).json({
          message: "Day is required.",
        });
      }

      const day = await Day.findById(dayId);

      if (!day) {
        return res.status(404).json({
          message: "Day not found.",
        });
      }

      if (day.status !== "open") {
        return res.status(400).json({
          message: "Today's session is closed.",
        });
      }

      // Get only active players
      const players = await Player.find({
        isActive: true,
      }).sort({ name: 1 });

      if (players.length < 4) {
        return res.status(400).json({
          message:
            "Minimum 4 active players required.",
        });
      }

      // Shuffle players
      const shuffled = [...players];

      for (
        let i = shuffled.length - 1;
        i > 0;
        i--
      ) {
        const j = Math.floor(
          Math.random() * (i + 1)
        );

        [shuffled[i], shuffled[j]] = [
          shuffled[j],
          shuffled[i],
        ];
      }

      // Pair every active player. An odd player sits out this round.
      const leftOut = shuffled.length % 2 === 1 ? shuffled.pop() : null;
      const teams = [];

      for (let index = 0; index < shuffled.length; index += 2) {
        teams.push(shuffled.slice(index, index + 2));
      }

      const [teamA, teamB] = teams;

      res.json({
        teamA,
        teamB,
        teams,
        leftOut,
        firstMatch: {
          teamA,
          teamB,
        },
      });
    } catch (error) {
      console.error(
        "Random team error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to generate random teams.",
      });
    }
  }
);

// ============================================================
// CREATE MATCH
// ============================================================

router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const { dayId, teamA, teamB } = req.body;

    if (!dayId) {
      return res.status(400).json({
        message: "Day is required.",
      });
    }

    const day = await Day.findById(dayId);

    if (!day || day.status !== "open") {
      return res.status(400).json({
        message: "Today's session is closed.",
      });
    }

    if (
      !Array.isArray(teamA) ||
      teamA.length !== 2
    ) {
      return res.status(400).json({
        message:
          "Team A must contain 2 players.",
      });
    }

    if (
      !Array.isArray(teamB) ||
      teamB.length !== 2
    ) {
      return res.status(400).json({
        message:
          "Team B must contain 2 players.",
      });
    }

    // Prevent duplicate players
    const uniquePlayers = new Set([
      ...teamA.map(String),
      ...teamB.map(String),
    ]);

    if (uniquePlayers.size !== 4) {
      return res.status(400).json({
        message:
          "A player cannot appear on both teams.",
      });
    }

    const match = await Match.create({
      day: dayId,
      teamA,
      teamB,
      status: "pending",
      stakePerPlayer: 5,
    });

    const populatedMatch =
      await Match.findById(match._id)
        .populate("teamA", "name")
        .populate("teamB", "name");

    res.status(201).json(
      populatedMatch
    );
  } catch (error) {
    console.error(
      "Create match error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to create match.",
    });
  }
});

// ============================================================
// SAVE MATCH RESULT
// ============================================================

router.put(
  "/:id/result",
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const {
        scoreA,
        scoreB,
        winner,
      } = req.body;

      const match =
        await Match.findById(
          req.params.id
        );

      if (!match) {
        return res.status(404).json({
          message:
            "Match not found.",
        });
      }

      const day =
        await Day.findById(
          match.day
        );

      if (
        !day ||
        day.status !== "open"
      ) {
        return res.status(400).json({
          message:
            "Today's session is closed.",
        });
      }

      const a = Number(scoreA);
      const b = Number(scoreB);

      if (
        Number.isNaN(a) ||
        Number.isNaN(b)
      ) {
        return res.status(400).json({
          message:
            "Scores must be numbers.",
        });
      }

      if (a === b) {
        return res.status(400).json({
          message:
            "Badminton cannot end in a tie.",
        });
      }

      match.scoreA = a;
      match.scoreB = b;
      match.winner = winner;
      match.status = "completed";

      await match.save();

      const populatedMatch =
        await Match.findById(match._id)
          .populate(
            "teamA",
            "name"
          )
          .populate(
            "teamB",
            "name"
          );

      res.json(
        populatedMatch
      );
    } catch (error) {
      console.error(
        "Save result error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to save result.",
      });
    }
  }
);

// ============================================================
// EDIT MATCH - ADMIN ONLY
// ============================================================

router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    const { teamA, teamB, scoreA, scoreB } = req.body;
    const match = await Match.findById(req.params.id).populate("day");

    if (!match) {
      return res.status(404).json({ message: "Match not found." });
    }

    if (match.day?.status === "closed") {
      return res.status(400).json({ message: "Closed-day matches cannot be edited." });
    }

    if (!Array.isArray(teamA) || teamA.length !== 2 || !Array.isArray(teamB) || teamB.length !== 2) {
      return res.status(400).json({ message: "Each team must contain exactly 2 players." });
    }

    const uniquePlayers = new Set([...teamA, ...teamB].map(String));
    if (uniquePlayers.size !== 4) {
      return res.status(400).json({ message: "A player cannot appear on both teams." });
    }

    match.teamA = teamA;
    match.teamB = teamB;

    const hasScores = scoreA !== "" && scoreB !== "" && scoreA !== null && scoreB !== null;
    if (hasScores) {
      const parsedScoreA = Number(scoreA);
      const parsedScoreB = Number(scoreB);

      if (!Number.isInteger(parsedScoreA) || !Number.isInteger(parsedScoreB) || parsedScoreA < 0 || parsedScoreB < 0 || parsedScoreA === parsedScoreB) {
        return res.status(400).json({ message: "Scores must be valid, non-tied whole numbers." });
      }

      match.scoreA = parsedScoreA;
      match.scoreB = parsedScoreB;
      match.winner = parsedScoreA > parsedScoreB ? "A" : "B";
      match.status = "completed";
    } else {
      match.scoreA = null;
      match.scoreB = null;
      match.winner = null;
      match.status = "pending";
    }

    await match.save();

    const updatedMatch = await Match.findById(match._id)
      .populate("day", "date status")
      .populate("teamA", "name")
      .populate("teamB", "name");

    res.json(updatedMatch);
  } catch (error) {
    console.error("Edit match error:", error);
    res.status(500).json({ message: "Failed to edit match." });
  }
});

// ============================================================
// DELETE MATCH - ADMIN ONLY
// ============================================================

router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id).populate("day");

    if (!match) {
      return res.status(404).json({ message: "Match not found." });
    }

    if (match.day?.status === "closed") {
      return res.status(400).json({ message: "Closed-day matches cannot be deleted." });
    }

    await Match.deleteOne({ _id: match._id });
    res.json({ message: "Match deleted successfully." });
  } catch (error) {
    console.error("Delete match error:", error);
    res.status(500).json({ message: "Failed to delete match." });
  }
});

module.exports = router;