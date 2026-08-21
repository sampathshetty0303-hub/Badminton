const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

const router = express.Router();

const normalizeEmail = (email) => email?.trim().toLowerCase();

const createToken = (user, role = user.role) => jwt.sign(
  {
    id: user._id,
    role,
    approved: role === "admin" || user.approved === true,
  },
  process.env.JWT_SECRET,
  { expiresIn: "7d" }
);

router.post("/register", async (req, res) => {
  try {
    const name = req.body.name?.trim() || "";
    const email = normalizeEmail(req.body.email);
    const password = typeof req.body.password === "string" ? req.body.password : "";

    if (!name) {
      return res.status(400).json({ message: "Name is required to create an account" });
    }

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({ message: "An account already exists for this email" });
    }

    const user = await User.create({
      name,
      email,
      password: await bcrypt.hash(password, 10),
      role: "player",
      approved: false,
    });

    return res.status(201).json({
      message: "Account created successfully",
      token: createToken(user, user.role),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        approved: false,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ message: "Unable to create account" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = typeof req.body.password === "string" ? req.body.password : "";

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isConfiguredAdmin = email === normalizeEmail(process.env.ADMIN_EMAIL);
    const authenticatedRole = isConfiguredAdmin ? "admin" : user.role;

    if (!isConfiguredAdmin && user.approved !== true) {
      return res.status(403).json({
        code: "ACCOUNT_PENDING_APPROVAL",
        message: "Your account is waiting for admin approval",
      });
    }

    return res.json({
      message: "Authentication successful",
      token: createToken(user, authenticatedRole),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: authenticatedRole,
        approved: user.approved === true || authenticatedRole === "admin",
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Unable to login" });
  }
});

module.exports = router;