const User = require("../../models/userSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const env = require("dotenv").config();
const session = require("express-session"); 

const getForgotPasswordPage = async (req, res) => {
  try {
    res.render("forgot-password/forgot-password");
  } catch (error) {
    console.error("Error rendering forgot password page:", error);
    res.status(500).send("Server error");
  }
};

const getResetPasswordPage = async (req, res) => {
  try {
    const email = req.query.email; 
    if (!email) {
      return res.status(400).send("Email not provided");
    }
    res.render("forgot-password/reset-password", { email });
  } catch (error) {
    console.error("Error rendering reset password page:", error);
    res.status(500).send("Server error");
  }
};

const loadEmailPage = async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) {
      return res.status(400).send("Email not provided");
    }
    res.render("forgot-password/enter-otp", { email });
  } catch (error) {
    console.error("Error rendering OTP page:", error);
    res.status(500).send("Server error");
  }
};

const sendForgotOtp = async (req, res) => {
  try {
    console.log("Full request object:", req); 
    console.log("Received req.body:", req.body); 

    const { email } = req.body;
    if (!email) {
      console.log("Email is undefined in req.body");
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found with this email" });
    }

    // Generate OTP and expiration (5 minutes)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiration = Date.now() + 5 * 60 * 1000; 

    // Store in session
    req.session.otp = otp;
    req.session.otpExpiration = otpExpiration;
    req.session.forgotEmail = email;

    console.log("Sending OTP to:", email, "OTP:", otp);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email, 
      subject: "Your OTP for Password Reset",
      text: `Your OTP is ${otp}. It expires in 5 minutes.`,
    };

    await transporter.sendMail(mailOptions);
    console.log("OTP sent successfully to", email, "at", new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

    return res.json({
      success: true,
      message: "OTP sent successfully",
      redirectUrl: `/enter-otp?email=${encodeURIComponent(email)}`,
    });
  } catch (error) {
    console.error("Send OTP Error at", new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }), ":", error);
    res.status(500).json({ success: false, message: "Failed to send OTP. Please try again." });
  }
};

const verifyForgotOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    const storedOtp = req.session.otp;
    const otpExpiration = req.session.otpExpiration;
    const email = req.session.forgotEmail;

    if (!email) {
      return res.json({ success: false, message: "No email found. Please start the process again." });
    }

    if (!storedOtp || storedOtp !== otp) {
      return res.json({ success: false, message: "Invalid OTP. Please try again." });
    }

    if (Date.now() > otpExpiration) {
      return res.json({ success: false, message: "OTP has expired. Please resend." });
    }

    // Clear OTP from session after verification
    delete req.session.otp;
    delete req.session.otpExpiration;

    return res.json({
      success: true,
      message: "OTP verified successfully",
      redirectUrl: `/reset-password?email=${encodeURIComponent(email)}`,
    });
  } catch (error) {
    console.error("Verify OTP Error at", new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }), ":", error);
    res.status(500).json({ success: false, message: "An error occurred during OTP verification." });
  }
};


const resendOtp = async (req, res) => {
  try {
    const email = req.session.forgotEmail;

    if (!email) {
      return res.json({ success: false, message: "No email found. Please start the process again." });
    }

    // Generate new OTP and expiration
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiration = Date.now() + 5 * 60 * 1000;

    // Update session
    req.session.otp = otp;
    req.session.otpExpiration = otpExpiration;

    console.log("Resending OTP to:", email, "OTP:", otp);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Resent OTP for Password Reset",
      text: `Your new OTP is: ${otp}. It expires in 5 minutes.`,
    };

    await transporter.sendMail(mailOptions);
    console.log("Resend OTP sent successfully to", email, "at", new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

    return res.json({ success: true, message: "OTP resent successfully" });
  } catch (error) {
    console.error("Resend OTP Error at", new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }), ":", error.message); // Enhanced error logging
    res.status(500).json({ success: false, message: `Failed to resend OTP. Error: ${error.message}` }); // Detailed error message
  }
};

const updatePassword = async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;

    if (!email || !password || !confirmPassword) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: "Passwords do not match" });
    }

    if (password.length < 8 || !/\d/.test(password) || !/[a-zA-Z]/.test(password)) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters long and contain both letters and numbers" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();

    // Clear session data
    delete req.session.forgotEmail;

    return res.json({ success: true, message: "Password updated successfully", redirectUrl: "/" });
  } catch (error) {
    console.error("Update Password Error:", error);
    res.status(500).json({ success: false, message: "Failed to update password. Please try again." });
  }
};

module.exports = {
  getForgotPasswordPage,
  loadEmailPage,
  sendForgotOtp,
  verifyForgotOtp,
  resendOtp,
  getResetPasswordPage,
  updatePassword,
};