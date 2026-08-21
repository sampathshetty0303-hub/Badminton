const crypto = require("crypto");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const User = require("../models/User");
const OtpVerification = require("../models/OtpVerification");

const router = express.Router();
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_COOLDOWN_MS = 60 * 1000;
const smtpPassword = process.env.SMTP_PASSWORD?.replace(/\s+/g, "");

const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  family: 4,
  connectionTimeout: 15000,
  socketTimeout: 15000,
  auth: {
    user: process.env.SMTP_USER,
    pass: smtpPassword,
  },
});

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

const sendOtp = async ({ email, code }) => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !smtpPassword || !process.env.SMTP_FROM) {
    throw new Error("SMTP authentication is not configured");
  }

  await mailer.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Your Shuttle verification code",
    text: `Your Shuttle verification code is ${code}. It expires in 10 minutes.`,
    html: `<p>Your Shuttle verification code is:</p><p style="font-size: 28px; font-weight: bold; letter-spacing: 8px">${code}</p><p>This code expires in 10 minutes.</p>`,
  });
};

router.post("/request-otp", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const purpose = req.body.purpose === "register" ? "register" : "login";
    const name = req.body.name?.trim() || "";

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }

    if (purpose === "register" && !name) {
      return res.status(400).json({ message: "Name is required to create an account" });
    }

    const existingUser = await User.findOne({ email });

    if (purpose === "login" && !existingUser) {
      return res.status(404).json({ message: "No account found for this email" });
    }

    if (purpose === "register" && existingUser) {
      return res.status(409).json({ message: "An account already exists for this email" });
    }

    const recentOtp = await OtpVerification.findOne({
      email,
      purpose,
      createdAt: { $gt: new Date(Date.now() - OTP_COOLDOWN_MS) },
    });

    if (recentOtp) {
      return res.status(429).json({ message: "Please wait before requesting another code" });
    }

    const code = crypto.randomInt(100000, 1000000).toString();
    const codeHash = await bcrypt.hash(code, 10);

    await OtpVerification.deleteMany({ email, purpose });
    await OtpVerification.create({
      email,
      name,
      purpose,
      codeHash,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    });

    await sendOtp({ email, code });

    return res.json({ message: "Verification code sent" });
  } catch (error) {
    console.error("Request OTP error:", error);
    return res.status(503).json({ message: "Unable to send verification code" });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const purpose = req.body.purpose === "register" ? "register" : "login";
    const code = String(req.body.code || "").trim();

    if (!email || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ message: "Enter the 6-digit verification code" });
    }

    const verification = await OtpVerification.findOne({
      email,
      purpose,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!verification || !(await bcrypt.compare(code, verification.codeHash))) {
      return res.status(401).json({ message: "Invalid or expired verification code" });
    }

    await OtpVerification.deleteMany({ email, purpose });

    let user = await User.findOne({ email });

    if (purpose === "register") {
      if (user) {
        return res.status(409).json({ message: "An account already exists for this email" });
      }

      user = await User.create({
        name: verification.name,
        email,
        password: await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10),
        role: "player",
        approved: false,
      });
    }

    if (!user) {
      return res.status(404).json({ message: "No account found for this email" });
    }

    const isConfiguredAdmin = purpose === "login"
      && email === normalizeEmail(process.env.ADMIN_EMAIL);

    if (purpose === "login" && !isConfiguredAdmin && user.approved !== true) {
      return res.status(403).json({
        code: "ACCOUNT_PENDING_APPROVAL",
        message: "Your account is waiting for admin approval",
      });
    }

    const authenticatedRole = isConfiguredAdmin ? "admin" : user.role;

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
    console.error("Verify OTP error:", error);
    return res.status(500).json({ message: "Unable to verify code" });
  }
});

module.exports = router;