const express = require("express");
const Day = require("../models/Day");
const Match = require("../models/Match");
const Settlement = require("../models/Settlement");
const Payment = require("../models/Payment");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

const BET_AMOUNT = 5;

// ============================================================
// GET CURRENT OPEN DAY
// ============================================================
router.get("/current", protect, async (req, res) => {
  try {
    const day = await Day.findOne({
      status: "open",
    }).sort({ date: -1 });

    res.json(day);
  } catch (error) {
    console.error("Get current day error:", error);

    res.status(500).json({
      message: "Failed to get current day",
      error: error.message,
    });
  }
});

// ============================================================
// OPEN NEW DAY - ADMIN ONLY
// ============================================================
router.post("/open", protect, adminOnly, async (req, res) => {
  try {
    // Check whether another day is already open
    const existingDay = await Day.findOne({
      status: "open",
    });

    if (existingDay) {
      return res.status(400).json({
        message: "There is already an open day",
        day: existingDay,
      });
    }

    const day = await Day.create({
      date: new Date(),
      status: "open",
      openedBy: req.user.id,
    });

    res.status(201).json({
      message: "Day opened successfully",
      day,
    });
  } catch (error) {
    console.error("Open day error:", error);

    res.status(500).json({
      message: "Failed to open day",
      error: error.message,
    });
  }
});

// ============================================================
// CLOSE DAY + CREATE SETTLEMENT + CREATE PAYMENTS
// ADMIN ONLY
// ============================================================
router.put("/close", protect, adminOnly, async (req, res) => {
  try {
    // --------------------------------------------------------
    // Find current open day
    // --------------------------------------------------------
    const day = await Day.findOne({
      status: "open",
    });

    if (!day) {
      return res.status(404).json({
        message: "No open day found",
      });
    }

    // --------------------------------------------------------
    // Get all matches
    // --------------------------------------------------------
    const matches = await Match.find({
      day: day._id,
    });

    // Empty sessions can be closed, but they do not create settlements.
    if (matches.length === 0) {
      day.status = "closed";
      day.closedBy = req.user.id;
      day.closedAt = new Date();
      await day.save();

      return res.json({
        message: "Day closed without matches. No settlement created.",
        day,
        settlement: null,
        payments: [],
      });
    }

    // --------------------------------------------------------
    // Check for incomplete matches
    // --------------------------------------------------------
    const incompleteMatches = matches.filter((match) => {
      return (
        match.scoreA === null ||
        match.scoreB === null ||
        match.winner === null
      );
    });

    if (incompleteMatches.length > 0) {
      return res.status(400).json({
        message:
          "All matches must have a score and winner before closing the day",

        incompleteMatches: incompleteMatches.map(
          (match) => match._id
        ),
      });
    }

    // --------------------------------------------------------
    // Calculate player balances
    // --------------------------------------------------------
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

      // Winners receive ₹5
      for (const playerId of winningTeam) {
        const id = playerId.toString();

        if (!balances[id]) {
          balances[id] = 0;
        }

        balances[id] += BET_AMOUNT;
      }

      // Losers pay ₹5
      for (const playerId of losingTeam) {
        const id = playerId.toString();

        if (!balances[id]) {
          balances[id] = 0;
        }

        balances[id] -= BET_AMOUNT;
      }
    }

    // --------------------------------------------------------
    // Validate total balance
    // --------------------------------------------------------
    const totalBalance = Object.values(balances).reduce(
      (total, amount) => total + amount,
      0
    );

    if (totalBalance !== 0) {
      return res.status(500).json({
        message: "Settlement calculation error",
        totalBalance,
      });
    }

    // --------------------------------------------------------
    // Create settlement entries
    // --------------------------------------------------------
    const entries = Object.entries(balances).map(
      ([player, amount]) => ({
        player,
        amount,

        // Zero balance doesn't require payment
        status: amount === 0 ? "paid" : "pending",
      })
    );

    // --------------------------------------------------------
    // Create settlement
    // --------------------------------------------------------
    const settlement = await Settlement.create({
      day: day._id,
      entries,
      status: "pending",
      createdBy: req.user.id,
    });

    // --------------------------------------------------------
    // Separate debtors and creditors
    // --------------------------------------------------------
    const debtors = Object.entries(balances)
      .filter(([, amount]) => amount < 0)
      .map(([player, amount]) => ({
        player,
        amount: Math.abs(amount),
      }));

    const creditors = Object.entries(balances)
      .filter(([, amount]) => amount > 0)
      .map(([player, amount]) => ({
        player,
        amount,
      }));

    // --------------------------------------------------------
    // Generate individual payments
    // --------------------------------------------------------
    const payments = [];

    for (const debtor of debtors) {
      let remainingDebt = debtor.amount;

      for (const creditor of creditors) {
        if (remainingDebt <= 0) {
          break;
        }

        if (creditor.amount <= 0) {
          continue;
        }

        const paymentAmount = Math.min(
          remainingDebt,
          creditor.amount
        );

        payments.push({
          settlement: settlement._id,
          fromPlayer: debtor.player,
          toPlayer: creditor.player,
          amount: paymentAmount,
          status: "pending",
        });

        remainingDebt -= paymentAmount;
        creditor.amount -= paymentAmount;
      }

      // Safety check
      if (remainingDebt > 0) {
        return res.status(500).json({
          message: "Could not complete payment calculation",
        });
      }
    }

    // --------------------------------------------------------
    // Save payment records
    // --------------------------------------------------------
    if (payments.length > 0) {
      await Payment.insertMany(payments);
    }

    // --------------------------------------------------------
    // Close the day
    // --------------------------------------------------------
    day.status = "closed";
    day.closedBy = req.user.id;
    day.closedAt = new Date();

    await day.save();

    // --------------------------------------------------------
    // Get populated settlement
    // --------------------------------------------------------
    const populatedSettlement =
      await Settlement.findById(settlement._id)
        .populate("day")
        .populate("entries.player", "name");

    // --------------------------------------------------------
    // Get populated payments
    // --------------------------------------------------------
    const populatedPayments = await Payment.find({
      settlement: settlement._id,
    })
      .populate("fromPlayer", "name")
      .populate("toPlayer", "name");

    // --------------------------------------------------------
    // Response
    // --------------------------------------------------------
    res.json({
      message:
        "Day closed and settlement created successfully",

      day,

      settlement: populatedSettlement,

      payments: populatedPayments,
    });
  } catch (error) {
    console.error("Close day error:", error);

    res.status(500).json({
      message: "Failed to close day",
      error: error.message,
    });
  }
});

module.exports = router;