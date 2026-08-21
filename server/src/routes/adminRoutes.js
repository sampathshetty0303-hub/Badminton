const express = require("express");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const User = require("../models/User");
const Player = require("../models/Player");

const router = express.Router();

router.get("/dashboard", protect, adminOnly, (req, res) => {
  res.json({
    message: "Welcome to the Admin Dashboard 🏸",
    user: req.user,
  });
});

router.get("/pending-users", protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find({ role: "player", approved: { $ne: true } })
      .select("name email createdAt")
      .sort({ createdAt: 1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to load pending accounts" });
  }
});

router.put("/users/:id/approve", protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: "player", approved: { $ne: true } },
      { approved: true },
      { new: true }
    ).select("name email role approved");

    if (!user) return res.status(404).json({ message: "Pending player account not found" });

    const existingPlayer = await Player.findOne({
      name: { $regex: `^${user.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    });

    if (!existingPlayer) {
      await Player.create({
        name: user.name,
        isActive: false,
        createdBy: req.user.id,
      });
    }

    res.json({ message: "Player account approved", user });
  } catch (error) {
    res.status(500).json({ message: "Failed to approve account" });
  }
});

module.exports = router;