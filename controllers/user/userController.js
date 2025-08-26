const User = require("../../models/userSchema");
require("dotenv").config();
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const mongoose = require("mongoose");

const pageNotFound = async (req, res) => {
  try {
    res.render("page-404");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const loadHomepage = async (req, res) => {
  try {
    const user = req.session.user;
    return res.render("home", { user });
  } catch (error) {
    console.log("Home page not found");
    res.status(500).send("Server error");
  }
};

const loadSignUp = async (req, res) => {
  try {
    if (req.session.user) {
      return res.redirect("/");
    } else {
      return res.render("signUp");
    }
  } catch (error) {
    console.log("Register page not loading", error);
    res.status(500).send("Server error");
  }
};

function generateOtp() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  console.log("Generated OTP:", otp); // Log the OTP here
  return otp;
}

async function sendVerificationEmail(email, otp) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Furniture App" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verify your Furniture App account",
      text: `Your OTP is ${otp}`,
      html: `<p>Hello,</p><p>Your OTP is: <b>${otp}</b></p><p>This code is valid for 5 minutes.</p>`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully:", info.messageId);
    return info.accepted.length > 0;
  } catch (error) {
    console.error("❌ Error sending OTP email:", error);
    return false;
  }
}

const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render("signUp", { error: "User already exists" });
    }

    const otp = generateOtp();
    const otpExpiration = Date.now() + 5 * 60 * 1000;

    const emailSent = await sendVerificationEmail(email, otp);
    if (!emailSent) {
      console.log("❌ OTP Email Failed");
      return res.render("signUp", { error: "Failed to send OTP. Try again." });
    }

    // Store OTP and user data in session
    req.session.userOtp = otp;
    req.session.otpExpiration = otpExpiration;
    req.session.userData = { name, email, password };

    console.log("✅ OTP Sent to:", email, "OTP:", otp);
    res.redirect("/verify");
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).send("Internal Server Error");
  }
};

const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {}
};

const loadOtpPage = (req, res) => {
  if (req.session.user) {
    return res.redirect("/");
  } else {
    const message = req.session.errorMessage || null;
    res.render("verify-otp", { message });
  }
};

const verifyRegister = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.render("signUp", { error: "User already exist" });
    } else {
      const otp = generateOtp();
      const otpExpiration = Date.now() + 5 * 60 * 1000; 
      req.session.otpExpiration = otpExpiration;

      const emailSent = await sendVerificationEmail(email, otp);
      if (!emailSent) {
        return res.json("email-error");
      }

      req.session.loggedIn = true;
      req.session.userOtp = otp;
      req.session.userData = { name, email, password, phone };

      console.log(req.session.userData);

      res.redirect("/verify");
      console.log("OTP Sent ", otp);
    }
  } catch (error) {
    console.error("Signup Error", error);
    res.status(500).send("Internal Server Error");
  }
};

const verifyOtp = async (req, res) => {
  try {
    const otpArray = req.body.otp;
    const otp = Array.isArray(otpArray) ? otpArray.join("") : otpArray;

    // Check if user data exists in the session
    if (!req.session.userData) {
      console.error("No user data found in session.");
      req.session.errorMessage =
        "Session expired or invalid. Please try again.";
      return res
        .status(400)
        .json({ success: false, message: req.session.errorMessage });
    }

    const user = req.session.userData;

    // Check if OTP has expired
    if (Date.now() > req.session.otpExpiration) {
      console.error("OTP has expired");
      req.session.errorMessage = "OTP has expired. Please request a new one.";

      // Clean up session data
      req.session.userOtp = null;
      req.session.otpExpiration = null;

      return res
        .status(400)
        .json({ success: false, message: req.session.errorMessage });
    }

    // Verify OTP
    if (otp === req.session.userOtp) {
      console.log("OTP matched:", otp);

      // Hash the password
      const passwordHash = await securePassword(user.password);

      // Save the user data
      const saveUserData = new User({
        name: user.name,
        email: user.email,
        password: passwordHash,
        otp: otp, 
        otpExpiration: new Date(Date.now() + 5 * 60 * 1000),
      });

      await saveUserData.save();
      console.log("User Saved Successfully:", saveUserData);

      // Clean up session after successful OTP verification
      req.session.userOtp = null;
      req.session.otpExpiration = null;
      req.session.userData = null;
      req.session.user = saveUserData._id; 

      req.session.errorMessage = "OTP verified successfully!";

      return res.json({
        success: true,
        message: "OTP Verified Successfully",
        redirectUrl: "/",
      });
    } else {
      console.error("Invalid OTP");
      req.session.errorMessage = "Invalid OTP. Please try again.";
      return res
        .status(400)
        .json({ success: false, message: req.session.errorMessage });
    }
  } catch (error) {
    console.error("Error Verifying OTP:", error);
    req.session.errorMessage =
      "An unexpected error occurred. Please try again.";

    // Clean up session in case of error
    req.session.userOtp = null;
    req.session.otpExpiration = null;

    return res
      .status(500)
      .json({ success: false, message: req.session.errorMessage });
  }
};

const resendOtp = async (req, res) => {
  try {
    if (!req.session.userData) {
      console.error("❌ No user data in session");
      return res.status(400).json({
        success: false,
        message: "No user data found in session.",
      });
    }

    const user = req.session.userData;
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiration = Date.now() + 5 * 60 * 1000;

    req.session.userOtp = newOtp;
    req.session.otpExpiration = otpExpiration;

    console.log("📧 Preparing to resend OTP...");
    console.log("EMAIL_USER:", process.env.EMAIL_USER);
    console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "Exists ✅" : "Missing ❌");
    console.log("Sending OTP to:", user.email, "| OTP:", newOtp);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Furniture App" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Resent OTP Code",
      text: `Hello ${user.name},\n\nYour new OTP is: ${newOtp}\nIt is valid for 5 minutes.`,
      html: `<p>Hello <b>${user.name}</b>,</p><p>Your new OTP is: <b>${newOtp}</b></p><p>This code is valid for 5 minutes.</p>`,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log("✅ New OTP sent via email:", newOtp);
    } catch (emailError) {
      console.error("❌ Email sending failed:", emailError);
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP email. Try again.",
      });
    }

    return res.json({
      success: true,
      message: "OTP resent successfully to your email!",
    });
  } catch (error) {
    console.error("❌ Error resending OTP:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to resend OTP. Please try again.",
    });
  }
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Input validation
    if (!name || !email || !password || !phone) {
      return res.status(400).send("All fields are required");
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).send("Email is already registered");
    }

    const otp = crypto.randomInt(100000, 999999).toString();

    const hashedPassword = await hashPassword(password);

    const newUser = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      otp,
      otpExpiration: Date.now() + 5 * 60 * 1000,
    });

    await newUser.save();

    await sendOTP(email, otp);

    res.redirect("/verify");
  } catch (err) {
    console.error("Error during registration:", err);
    res.status(500).send("Internal Server Error");
  }
};

const loadLogin = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.render("login", { message: null });
    } else {
      res.redirect("/");
    }
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Log the incoming request data to debug
    console.log("Login data:", req.body);

    // Search for user by email and isAdmin condition
    const findUser = await User.findOne({ isAdmin: 0, email: email });

    // Check if user was found
    if (!findUser) {
      console.log("User not found with email:", email); 
      return res.render("login", { message: "User not found" });
    }

    // Check if user is blocked
    if (findUser.isBlocked) {
      console.log("User is blocked:", email);
      return res.render("login", { message: "User is blocked by admin" });
    }

    // Compare password
    const passwordMatch = await bcrypt.compare(password, findUser.password);
    console.log();

    if (!passwordMatch) {
      console.log("Incorrect password for user:", email);
      return res.render("login", { message: "Incorrect Password" });
    }

    // If everything is correct, set the session and redirect
    req.session.user = findUser._id;
    
    
    console.log("Session set for user:", req.session.user);
    res.redirect("/");
  } catch (error) {
    console.error("Login error:", error);
    res.render("login", { message: "Login failed. Please try again later" });
  }
};

const sendOtpEmail = async (req, res) => {
  try {
    const user = req.session.userData;

    if (!user || !user.email) {
      console.log("❌ No user session found");
      return res.status(400).json({ success: false, message: "User not logged in" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    req.session.userOtp = otp;
    req.session.otpExpiration = Date.now() + 5 * 60 * 1000;

    console.log("Sending OTP to:", user.email);
    console.log("Generated OTP:", otp);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    transporter.verify((err, success) => {
      if (err) {
        console.error("❌ Transporter error:", err);
      } else {
        console.log("✅ Mail server ready");
      }
    });

    const mailOptions = {
      from: `"Furniture App" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Your OTP Code",
      text: `Hello ${user.name},\n\nYour OTP is: ${otp}\nIt is valid for 5 minutes.`,
      html: `<p>Hello <b>${user.name}</b>,</p><p>Your OTP is: <b>${otp}</b></p><p>This code is valid for 5 minutes.</p>`,
    };

    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: "OTP sent successfully to your email" });
  } catch (error) {
    console.error("❌ Error sending email:", error.response || error);
    res.status(500).json({ success: false, message: "Failed to send OTP email." });
  }
};


const loadShopPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;

    const search = req.query.search || "";
    const sortOption = req.query.sort || "";
    const categoryName = req.query.category;
    const minPrice = parseFloat(req.query.minPrice);
    const maxPrice = parseFloat(req.query.maxPrice);

    const listedCategories = await Category.find({ isListed: true }).select("_id");
    const listedCategoryIds = listedCategories.map((cat) => cat._id);

    const filter = {
      isBlocked: false,
      category: { $in: listedCategoryIds }, 
      productName: { $regex: search, $options: "i" },
    };

    if (categoryName) {
      const selectedCategory = await Category.findOne({
        name: categoryName.trim(),
        isListed: true,
      });

      if (selectedCategory) {
        filter.category = selectedCategory._id;
      } else {
        filter.category = null;
      }
    }

    if (!isNaN(minPrice)) {
      filter.salePrice = { ...filter.salePrice, $gte: minPrice };
    }
    if (!isNaN(maxPrice)) {
      filter.salePrice = { ...filter.salePrice, $lte: maxPrice };
    }

    let sort = { createdAt: -1 }; 
    if (sortOption === "name-asc") sort = { productName: 1 };
    else if (sortOption === "name-desc") sort = { productName: -1 };
    else if (sortOption === "price-asc") sort = { salePrice: 1 };
    else if (sortOption === "price-desc") sort = { salePrice: -1 };
    else if (sortOption === "newest") sort = { createdAt: -1 };
    else if (sortOption === "oldest") sort = { createdAt: 1 }; 

    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);
    const products = await Product.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate("category");

    const categories = await Category.find({ isListed: true });

    if (req.xhr || req.headers.accept.includes("application/json")) {
      res.json({
        products,
        totalPages,
        currentPage: page,
      });
    } else {
      res.render("shop", {
        product: products,
        currentPage: page,
        totalPages,
        search,
        sort: sortOption,
        category: categoryName,
        minPrice,
        maxPrice,
        categories,
      });
    }
  } catch (err) {
    console.error("Error loading shop page:", err);
    res.status(500).send("Internal Server Error");
  }
};

const productDetails = async (req, res) => {
  try {
    const productId = req.params.id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      console.log("Invalid product ID:", productId);
      return res
        .status(400)
        .render("errorPage", { message: "Invalid product ID" }); // Render an error page
    }

    // Query the product by ID
    const product = await Product.findOne({ _id: productId });
    const simliarProducts = await Product.find({}).limit(4);

    if (!product) {
      console.log("Product not found for ID:", productId);
      return res
        .status(404)
        .render("errorPage", { message: "Product not found" }); // Render a not-found page
    }

    console.log("Product in details:", product);
    res.render("productDetails", { product, products: simliarProducts });
  } catch (error) {
    console.log("Error displaying product details:", error);
    res.status(500).render("errorPage", { message: "Internal server error" }); // Render a generic error page
  }
};

const loadContactPage = async(req,res)=>{
  res.render('contact')
}

module.exports = {
  loadHomepage,
  pageNotFound,
  loadSignUp,
  sendVerificationEmail,
  signup,
  verifyRegister,
  loadOtpPage,
  verifyOtp,
  resendOtp,
  loadLogin,
  login,
  registerUser,
  loadShopPage,
  productDetails,
  sendOtpEmail,
  loadContactPage
};
