const express = require("express");

const Player = require("../models/Player");

const {
  protect,
  adminOnly,
} = require("../middleware/authMiddleware");

const router = express.Router();

// ============================================================
// GET ALL PLAYERS
// Logged-in users can view players
// ============================================================

router.get("/", protect, async (req, res) => {
  try {
    const players = await Player.find()
      .sort({
        isActive: -1,
        name: 1,
      });

    res.json(players);
  } catch (error) {
    console.error("Get players error:", error);

    res.status(500).json({
      message: "Failed to get players",
    });
  }
});

// ============================================================
// GET ACTIVE PLAYERS
// Logged-in users can view active players
// ============================================================

router.get("/active", protect, async (req, res) => {
  try {
    const players = await Player.find({
      isActive: true,
    }).sort({
      name: 1,
    });

    res.json(players);
  } catch (error) {
    console.error(
      "Get active players error:",
      error
    );

    res.status(500).json({
      message: "Failed to get active players",
    });
  }
});

// ============================================================
// ADD PLAYER
// ADMIN ONLY
// ============================================================

router.post(
  "/",
  protect,
  adminOnly,
  async (req, res) => {
    return res.status(403).json({
      message: "Players must register and be approved before they can be activated.",
    });

    /* istanbul ignore next */
    try {
      const {
        name,
        phone,
      } = req.body;

      const cleanName =
        name?.trim();

      const cleanPhone =
        phone?.trim() || "";

      if (!cleanName) {
        return res.status(400).json({
          message:
            "Player name is required.",
        });
      }

      // Check duplicate name
      const existingPlayer =
        await Player.findOne({
          name: {
            $regex: `^${cleanName}$`,
            $options: "i",
          },
        });

      if (existingPlayer) {
        return res.status(400).json({
          message:
            "A player with this name already exists.",
        });
      }

      const player =
        await Player.create({
          name: cleanName,
          phone: cleanPhone,
          isActive: true,
          createdBy: req.user.id,
        });

      res.status(201).json({
        message:
          "Player added successfully.",
        player,
      });
    } catch (error) {
      console.error(
        "Create player error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to create player",
        error: error.message,
      });
    }
  }
);

// ============================================================
// UPDATE PLAYER
// ADMIN ONLY
// ============================================================

router.put(
  "/:id",
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const {
        name,
        phone,
        isActive,
      } = req.body;

      const player =
        await Player.findById(
          req.params.id
        );

      if (!player) {
        return res.status(404).json({
          message:
            "Player not found.",
        });
      }

      // Update name
      if (
        name !== undefined
      ) {
        const cleanName =
          name.trim();

        if (!cleanName) {
          return res.status(400).json({
            message:
              "Player name cannot be empty.",
          });
        }

        // Check duplicate name
        const duplicate =
          await Player.findOne({
            _id: {
              $ne: player._id,
            },
            name: {
              $regex: `^${cleanName}$`,
              $options: "i",
            },
          });

        if (duplicate) {
          return res.status(400).json({
            message:
              "Another player with this name already exists.",
          });
        }

        player.name =
          cleanName;
      }

      // Update phone
      if (
        phone !== undefined
      ) {
        player.phone =
          phone.trim();
      }

      // Update active status
      if (
        isActive !== undefined
      ) {
        player.isActive =
          Boolean(isActive);
      }

      await player.save();

      res.json({
        message:
          "Player updated successfully.",
        player,
      });
    } catch (error) {
      console.error(
        "Update player error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to update player",
        error: error.message,
      });
    }
  }
);

// ============================================================
// DELETE PLAYER
// ADMIN ONLY
// ============================================================
//
// We don't permanently delete the player.
// We deactivate them instead.
// This keeps historical match data safe.
// ============================================================

router.delete(
  "/:id",
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const player =
        await Player.findById(
          req.params.id
        );

      if (!player) {
        return res.status(404).json({
          message:
            "Player not found.",
        });
      }

      player.isActive = false;

      await player.save();

      res.json({
        message:
          "Player deactivated successfully.",
        player,
      });
    } catch (error) {
      console.error(
        "Delete player error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to deactivate player",
      });
    }
  }
);

module.exports = router;