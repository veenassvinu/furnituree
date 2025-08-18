// const User = require("../../models/userSchema");
// const nodemailer = require("nodemailer");
// const bcrypt = require("bcrypt");
// const env = require("dotenv").config();
// const session = require("express-session");

// const otpStore = {};

// // 👉 Render Forgot Password Page
// const getForgotPasswordPage = async (req, res) => {
//   try {
//     res.render("forgot-password/forgot-password");
//   } catch (error) {
//     console.log(error);
//     res.status(500).send("Server error");
//   }
// };

// const getForgotPassPage = (req, res) => {
//   res.render("forgot-password/forgot-email-otp");
// };

// // 👉 Render Enter OTP Page (with email passed via query)
// const loadEmailPage = async (req, res) => {
//   try {
//     const { email } = req.query;

//     if (!email) {
//       return res.status(400).send("Email not provided");
//     }

//     res.render("forgot-password/forgot-email-otp", { email });
//   } catch (error) {
//     console.log(error);
//     res.status(500).send("Server error");
//   }
// };

// // 👉 Send OTP to user's email
// const sendForgotOtp = async (req, res) => {
//   const { email } = req.body;

//   if (!email) {
//     return res
//       .status(400)
//       .json({ success: false, message: "Email is required" });
//   }

//   const otp = Math.floor(100000 + Math.random() * 900000).toString();
//   otpStore[email] = otp;

//   console.log("Sending OTP to:", email, "OTP:", otp);

//   const transporter = nodemailer.createTransport({
//     service: "gmail",
//     auth: {
//       user: process.env.EMAIL_USER,
//       pass: process.env.EMAIL_PASS,
//     },
//   });

//   const mailOptions = {
//     from: process.env.EMAIL_USER,
//     to: email,
//     subject: "Your OTP for Password Reset",
//     text: `Your OTP is ${otp}`,
//   };

//   try {
//     await transporter.sendMail(mailOptions);

//     return res.json({
//       success: true,
//       message: "OTP sent successfully",
//       redirectUrl: `/enter-otp?email=${encodeURIComponent(email)}`,
//     });
//   } catch (error) {
//     console.error("Send OTP Error:", error);
//     return res
//       .status(500)
//       .json({ success: false, message: "Failed to send OTP" });
//   }
// };

// // // 👉 Verify OTP
// const verifyForgotOtp = async (req, res) => {
//   try {
//     const { otp } = req.body;

//     const email = Object.keys(otpStore).find((key) => otpStore[key] === otp);

//     if (!email) {
//       return res.json({ success: false, message: "Invalid OTP" });
//     }

//     delete otpStore[email];

//     return res.json({
//       success: true,
//       message: "OTP verified successfully",
//       redirectUrl: `/reset-password?email=${encodeURIComponent(email)}`,
//     });
//   } catch (error) {
//     console.error("Verify OTP Error:", error);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// };

// // 👉 Resend OTP
// const resendOtp = async (req, res) => {
//   try {
//     const { email } = req.body;

//     if (!email) {
//       return res.json({ success: false, message: "No email found" });
//     }

//     const otp = Math.floor(100000 + Math.random() * 900000).toString();
//     otpStore[email] = otp;

//     console.log("Resending OTP to:", email, "OTP:", otp);

//     const transporter = nodemailer.createTransport({
//       service: "gmail",
//       auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS,
//       },
//     });

//     const mailOptions = {
//       from: process.env.EMAIL_USER,
//       to: email,
//       subject: "Resent OTP",
//       text: `Your new OTP is: ${otp}`,
//     };

//     await transporter.sendMail(mailOptions);

//     return res.json({ success: true });
//   } catch (error) {
//     console.error("Resend OTP Error:", error);
//     return res
//       .status(500)
//       .json({ success: false, message: "Failed to resend OTP" });
//   }
// };

// module.exports = {
//   getForgotPasswordPage,
//   getForgotPassPage,
//   loadEmailPage,
//   sendForgotOtp,
//   verifyForgotOtp,
//   resendOtp,
// };
