const express = require("express");
const Payment = require("../models/Payment");
const {
  protect,
  adminOnly,
} = require("../middleware/authMiddleware");

const router = express.Router();

// ============================================================
// GET ALL PAYMENTS FOR A SETTLEMENT
// ============================================================
router.get(
  "/settlement/:settlementId",
  protect,
  async (req, res) => {
    try {
      const payments = await Payment.find({
        settlement: req.params.settlementId,
      })
        .populate("fromPlayer", "name")
        .populate("toPlayer", "name")
        .populate("verifiedBy", "name")
        .sort({ createdAt: 1 });

      res.json(payments);
    } catch (error) {
      console.error("Get payments error:", error);

      res.status(500).json({
        message: "Failed to get payments",
        error: error.message,
      });
    }
  }
);

// ============================================================
// GET SINGLE PAYMENT
// ============================================================
router.get("/:id", protect, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate("fromPlayer", "name")
      .populate("toPlayer", "name")
      .populate("verifiedBy", "name");

    if (!payment) {
      return res.status(404).json({
        message: "Payment not found",
      });
    }

    res.json(payment);
  } catch (error) {
    console.error("Get payment error:", error);

    res.status(500).json({
      message: "Failed to get payment",
      error: error.message,
    });
  }
});

// ============================================================
// SUBMIT PAYMENT
// TEMPORARILY ADMIN ONLY
// ============================================================
router.put(
  "/:id/submit",
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const {
        transactionId,
        proofUrl,
      } = req.body;

      const payment = await Payment.findById(
        req.params.id
      );

      if (!payment) {
        return res.status(404).json({
          message: "Payment not found",
        });
      }

      if (payment.status === "verified") {
        return res.status(400).json({
          message: "Payment has already been verified",
        });
      }

      payment.status = "submitted";
      payment.transactionId =
        transactionId || null;
      payment.proofUrl =
        proofUrl || null;
      payment.submittedAt = new Date();

      await payment.save();

      const updatedPayment =
        await Payment.findById(payment._id)
          .populate("fromPlayer", "name")
          .populate("toPlayer", "name")
          .populate("verifiedBy", "name");

      res.json({
        message:
          "Payment submitted successfully",
        payment: updatedPayment,
      });
    } catch (error) {
      console.error(
        "Submit payment error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to submit payment",
        error: error.message,
      });
    }
  }
);

// ============================================================
// VERIFY PAYMENT - ADMIN ONLY
// ============================================================
router.put(
  "/:id/verify",
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const payment =
        await Payment.findById(req.params.id);

      if (!payment) {
        return res.status(404).json({
          message: "Payment not found",
        });
      }

      if (!["pending", "submitted"].includes(payment.status)) {
        return res.status(400).json({
          message: "Payment has already been marked as paid",
        });
      }

      payment.status = "verified";
      payment.verifiedAt = new Date();
      payment.verifiedBy = req.user.id;

      await payment.save();

      const updatedPayment =
        await Payment.findById(payment._id)
          .populate("fromPlayer", "name")
          .populate("toPlayer", "name")
          .populate("verifiedBy", "name");

      res.json({
        message:
          "Payment marked as paid successfully",
        payment: updatedPayment,
      });
    } catch (error) {
      console.error(
        "Verify payment error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to verify payment",
        error: error.message,
      });
    }
  }
);

module.exports = router;