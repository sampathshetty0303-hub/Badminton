const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");

const User = require("./models/User");

dotenv.config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected");

    const email = "sampathshetty0303@gmail.com";
    const password = "admin123";
    const name = "Admin";

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    let user = await User.findOne({ email });

    if (user) {
      user.name = name;
      user.password = hashedPassword;
      user.role = "admin";
      user.approved = true;

      await user.save();

      console.log("Existing admin account updated");
    } else {
      user = await User.create({
        name,
        email,
        password: hashedPassword,
        role: "admin",
        approved: true,
      });

      console.log("Admin account created");
    }

    console.log("");
    console.log("================================");
    console.log("ADMIN LOGIN");
    console.log("================================");
    console.log("Email:    sampathshetty0303@gmail.com");
    console.log("Login:    request an email OTP");
    console.log("Role:     admin");
    console.log("================================");
    console.log("");

    await mongoose.disconnect();

    process.exit(0);
  } catch (error) {
    console.error("Failed to create admin:");
    console.error(error);

    process.exit(1);
  }
};

createAdmin();