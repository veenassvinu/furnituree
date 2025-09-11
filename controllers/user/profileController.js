const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const upload = require("../../middlewares/profileUpload"); 
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const env = require("dotenv").config();
const session = require("express-session");
const fs = require("fs");
const path = require("path");


// Load profile page
const loadProfilePage = async (req, res) => {
  try {
    const userId = req.session.user;
    console.log("User ID from session:", userId);

    if (!userId) {
      return res.redirect("/login");
    }

    const user = await User.findById(userId);
    console.log("User found:", user);

    if (!user) {
      return res.redirect("/login");
    }

    res.render("profile/profile", { userData: user ,activePage: "profile"});
  } catch (error) {
    console.error("Error loading profile page:", error);
    res.redirect("/pageNotFound");
  }
};

const loadDashboard = async (req, res) => {
  try {
    const userId = req.session.user;
    console.log("Dashboard - User ID from session:", userId);

    if (!userId) {
      return res.redirect("/login");
    }

    const user = await User.findById(userId);
    console.log("Dashboard - User found:", user);

    if (!user) {
      return res.redirect("/login");
    }

    res.render("profile/dashboard", { userData: user ,activePage: "dashboard", });

  } catch (error) {
    console.error("Error loading dashboard page:", error);
    res.redirect("/pageNotFound");
  }
};

// Update Profile Image
const updateProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image uploaded" });
    }

    let userId = null;

    if (req.session.userData) {
      userId = req.session.userData._id || req.session.userData;
    } else if (req.session.user) {
      userId = req.session.user._id || req.session.user;
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: "Please login first" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // remove old image if exists
    if (user.profileImage) {
      const oldImagePath = path.join(
        __dirname,
        "../public/uploads/profile-images",
        user.profileImage
      );
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    // save new file name in DB
    user.profileImage = req.file.filename;
    await user.save();

    return res.json({ success: true, profileImage: req.file.filename });
  } catch (error) {
    console.error("Error updating profile image:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error while updating profile image" });
  }
};

const updateProfileOrPassword = async (req, res) => {
  try {
    const userId = req.session.user;

    if (!userId) {
      return res.status(401).json({ message: "Please login first" });
    }

    console.log("Update request body:", req.body);
    console.log("User ID:", userId);

    // Password update logic
    if (
      req.body.currentPassword &&
      req.body.newPassword &&
      req.body.confirmNewPassword
    ) {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const isMatch = await bcrypt.compare(
        req.body.currentPassword,
        user.password
      );
      if (!isMatch)
        return res.status(400).json({ message: "Current password is incorrect" });

      if (req.body.newPassword !== req.body.confirmNewPassword) {
        return res.status(400).json({ message: "New passwords do not match" });
      }

      const passwordPattern =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordPattern.test(req.body.newPassword)) {
        return res.status(400).json({
          message:
            "Password must contain at least 8 characters, including uppercase, lowercase, number, and special character",
        });
      }

      const hashedPassword = await bcrypt.hash(req.body.newPassword, 10);
      user.password = hashedPassword;
      await user.save();

      return res.status(200).json({ message: "Password updated successfully" });
    }

    // Profile update logic
    const updateFields = {};

    if (req.body.name !== undefined) {
      const name = req.body.name.trim();
      if (name.length < 2) {
        return res
          .status(400)
          .json({ message: "Name must be at least 2 characters long" });
      }
      if (!/^[a-zA-Z\s]+$/.test(name)) {
        return res
          .status(400)
          .json({ message: "Name can only contain letters and spaces" });
      }
      updateFields.name = name;
    }

    if (req.body.email !== undefined) {
      const email = req.body.email.trim().toLowerCase();
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailPattern.test(email)) {
        return res
          .status(400)
          .json({ message: "Please enter a valid email address" });
      }

      const existingUser = await User.findOne({
        email: email,
        _id: { $ne: userId },
      });

      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      updateFields.email = email;
    }

    if (req.body.phone !== undefined) {
      const phone = req.body.phone.trim();
      if (phone && !/^\d{10}$/.test(phone)) {
        return res
          .status(400)
          .json({ message: "Please enter a valid 10-digit phone number" });
      }
      updateFields.phone = phone || null;
    }

    if (req.file) {
      updateFields.profileImage = req.file.filename;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      user: {
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        profileImage: updatedUser.profileImage || null,
      },
    });
  } catch (error) {
    console.error("Error updating profile:", error);

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
      });
    }

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ message: messages.join(", ") });
    }

    res.status(500).json({ message: "Internal Server Error" });
  }
};

const removeProfileImage = async (req, res) => {
  try {
    let userId = null;

    if (req.session.userData) {
      userId = req.session.userData._id || req.session.userData;
    } else if (req.session.user) {
      userId = req.session.user._id || req.session.user;
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: "Please login first" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.profileImage) {
      const imagePath = path.join(
        __dirname,
        "../../public/uploads/profile-images",
        user.profileImage
      );

      console.log("🖼️ Trying to delete:", imagePath);

      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log("✅ Deleted:", imagePath);
      } else {
        console.warn("⚠️ File not found:", imagePath);
      }

      user.profileImage = null;
      await user.save();
    }

    return res.json({ success: true, message: "Profile image removed" });
  } catch (error) {
    console.error("Error removing profile image:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while removing profile image",
    });
  }
};

const transporter = nodemailer.createTransport({
    service: 'gmail', // Use your email service (e.g., Gmail, SendGrid)
    auth: {
        user: process.env.EMAIL_USER, // Your email address
        pass: process.env.EMAIL_PASS, // Your email password or app-specific password
    },
});

// Generate a 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};


// Store OTPs temporarily (in-memory for simplicity, use Redis or DB for production)
const otpStore = new Map();

// Send OTP to email
const sendOTP = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        // Check if email is already in use by another user
        const existingUser = await User.findOne({ email });
        if (existingUser && existingUser._id.toString() !== req.user._id.toString()) {
            return res.status(400).json({ success: false, message: 'Email is already in use' });
        }

        // Generate and store OTP
        const otp = generateOTP();
        otpStore.set(email, { otp, expires: Date.now() + 10 * 60 * 1000 }); // OTP expires in 10 minutes

        console.log(`Generated OTP for ${email}: ${otp}`);

        // Send OTP email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Email Verification OTP',
            text: `Your OTP for email verification is: ${otp}. It is valid for 10 minutes.`,
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ success: true, message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).json({ success: false, message: 'Failed to send OTP' });
    }
};

// // Verify OTP
// const verifyOTP = async (req, res) => {
//     try {
//         const { email, otp } = req.body;

//         if (!email || !otp) {
//             return res.status(400).json({ success: false, message: 'Email and OTP are required' });
//         }

//         const storedOTP = otpStore.get(email);

//         if (!storedOTP) {
//             return res.status(400).json({ success: false, message: 'OTP not found or expired' });
//         }

//         if (storedOTP.expires < Date.now()) {
//             otpStore.delete(email);
//             return res.status(400).json({ success: false, message: 'OTP has expired' });
//         }

//         if (storedOTP.otp !== otp) {
//             return res.status(400).json({ success: false, message: 'Invalid OTP' });
//         }

//         // OTP is valid, update user's email
//         const user = await User.findById(req.user._id);
//         if (!user) {
//             return res.status(404).json({ success: false, message: 'User not found' });
//         }

//         user.email = email;
//         await user.save();

//         // Clear OTP from store
//         otpStore.delete(email);

//         res.status(200).json({ success: true, message: 'Email verified and updated successfully', user });
//     } catch (error) {
//         console.error('Error verifying OTP:', error);
//         res.status(500).json({ success: false, message: 'Failed to verify OTP' });
//     }
// };

// ✅ verify OTP
const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ success: false, message: 'Email and OTP are required' });
        }

        const storedOTP = otpStore.get(email);

        if (!storedOTP) {
            return res.status(400).json({ success: false, message: 'OTP not found or expired' });
        }

        if (storedOTP.expires < Date.now()) {
            otpStore.delete(email);
            return res.status(400).json({ success: false, message: 'OTP has expired' });
        }

        if (storedOTP.otp !== otp) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        // ✅ Handle both full object and plain ID in session
        let userId = null;
        if (req.session.userData) {
            userId = req.session.userData._id || req.session.userData;
        } else if (req.session.user) {
            userId = req.session.user._id || req.session.user;
        }

        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not logged in' });
        }

        // OTP is valid, update user's email
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.email = email;
        await user.save();

        // Clear OTP from store
        otpStore.delete(email);

        res.status(200).json({
            success: true,
            message: 'Email verified and updated successfully',
            user,
        });
    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({ success: false, message: 'Failed to verify OTP' });
    }
};




const loadAddressPage = async (req, res) => {
  try {
    const userId = req.session.user;
    console.log("Address page - User ID:", userId);

    if (!userId) {
      return res.redirect("/login");
    }

    const addressDoc = await Address.findOne({ userId });
    const addresses = addressDoc ? addressDoc.address : [];

    res.render("profile/address", { addresses ,activePage: "address"});
  } catch (error) {
    console.error("Error loading address page:", error);
    res.status(500).render("error", { message: "Error rendering the page" });
  }
};

const addAddress = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Please login first",
      });
    }

    const {
      addressType,
      name,
      phone,
      email,
      landMark,
      city,
      state,
      pincode,
      country,
    } = req.body;

    console.log(req.body);

    // Validate required fields
    if (
      !addressType ||
      !name ||
      !phone ||
      !landMark ||
      !city ||
      !state ||
      !pincode ||
      !country
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields are necessary",
      });
    }

    // Validate phone number
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 10-digit phone number",
      });
    }

    // Validate email if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    // Validate pincode
    if (!/^\d{6}$/.test(pincode)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 6-digit pincode",
      });
    }

    let addressDoc = await Address.findOne({ userId });
    if (!addressDoc) {
      addressDoc = new Address({ userId, address: [] });
    }

    addressDoc.address.push({
      addressType,
      name,
      phone,
      email: email || "",
      landMark,
      city,
      state,
      pincode,
      country,
    });

    await addressDoc.save();

    res.json({
      success: true,
      message: "Address added successfully",
    });
  } catch (error) {
    console.error("Error adding address:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Update Address Function
const updateAddress = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Please login first",
      });
    }

    const addressId = req.params.id;
    const {
      addressType,
      name,
      phone,
      email,
      landMark,
      city,
      state,
      pincode,
      country,
    } = req.body;

    // Validate required fields
    if (
      !addressType ||
      !name ||
      !phone ||
      !landMark ||
      !city ||
      !state ||
      !pincode ||
      !country
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields are necessary",
      });
    }

    // Validate phone number
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 10-digit phone number",
      });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    if (!/^\d{6}$/.test(pincode)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 6-digit pincode",
      });
    }

    const addressDoc = await Address.findOneAndUpdate(
      { userId, "address._id": addressId },
      {
        $set: {
          "address.$.addressType": addressType,
          "address.$.name": name,
          "address.$.phone": phone,
          "address.$.email": email || "",
          "address.$.landMark": landMark,
          "address.$.city": city,
          "address.$.state": state,
          "address.$.pincode": pincode,
          "address.$.country": country,
        },
      },
      { new: true }
    );

    if (!addressDoc) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    res.json({
      success: true,
      message: "Address updated successfully",
    });
  } catch (error) {
    console.error("Error updating address:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Please login first",
      });
    }

    const addressId = req.params.id;

    const addressDoc = await Address.findOneAndUpdate(
      { userId },
      { $pull: { address: { _id: addressId } } },
      { new: true }
    );

    if (!addressDoc) {
      return res.status(404).json({
        success: false,
        message: "User or address not found",
      });
    }

    res.json({
      success: true,
      message: "Address deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting address:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const loadProfileOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      console.log("No userId in session, redirecting to login");
      return res.redirect("/login");
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    console.log(
      `Orders page - User ID: ${userId}, Page: ${page}, Skip: ${skip}, Limit: ${limit}`
    );

    const totalOrders = await Order.countDocuments({ userId });
    console.log(`Total orders: ${totalOrders}`);

    const orders = await Order.find({ userId })
      .sort({ createdAt: -1 })
      .populate("items.productId")
      .skip(skip)
      .limit(limit);

    // Pagination metadata
    const totalPages = Math.ceil(totalOrders / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
  
    console.log(
      `Total Pages: ${totalPages}, Has Prev: ${hasPrevPage}, Has Next: ${hasNextPage}`
    );

    res.render("profile/profileorder", {
      orders,
      currentPage: page,
      totalPages,
      hasNextPage,
      hasPrevPage,
      activePage: "orders",
    });
  } catch (error) {
    console.error("Error in loadProfileOrder:", error);
    res.status(500).render("error", {
      message: "Error loading orders page",
    });
  }
};

const loadOrderDetails = async (req, res) => {
  try {
    const userId = req.session.user;
    const orderId = req.params.id;

    if (!userId) {
      console.log("No userId in session, redirecting to login");
      return res.redirect("/login");
    }

    const order = await Order.findOne({ _id: orderId, userId })
      .populate("items.productId")
      .populate("address");

    if (!order) {
      return res.status(404).render("error", {
        message: "Order not found",
      });
    }

    res.render("profile/orderDetails", {
      order,
      userData: await User.findById(userId),
    });
  } catch (error) {
    console.error("Error in loadOrderDetails:", error);
    res.status(500).render("error", {
      message: "Error loading order details",
    });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const orderId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Please login first",
      });
    }

    const order = await Order.findOne({ _id: orderId, userId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.status === "Cancelled" || order.status === "Returned") {
      return res.status(400).json({
        success: false,
        message: "Order is already cancelled or returned",
      });
    }

    if (order.status === "Delivered") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel a delivered order",
      });
    }

    // Update order status
    order.status = "Cancelled";
    await order.save();

    // Refund to wallet
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.walletBalance) {
      user.walletBalance = 0;
    }

    user.walletBalance += order.totalPrice;
    await user.save();

    res.json({
      success: true,
      message: `Order cancelled successfully. ₹${order.totalPrice.toFixed(
        2
      )} refunded to your wallet.`,
      newBalance: user.walletBalance,
    });
  } catch (error) {
    console.error("Error cancelling order:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const loadWallet = async (req, res) => {
  try {
    const userId = req.session.user;

    if (!userId) {
      return res.redirect("/login");
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.redirect("/login");
    }

    res.render("profile/wallet", { userData: user,activePage: "wallet" });
  } catch (error) {
    console.error("Error loading wallet page:", error);
    res.redirect("/pageNotFound");
  }
};

const addWalletMoney = async (req, res) => {
  try {
    const userId = req.session.user;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Please login first",
      });
    }

    const { amount } = req.body;
    const amountNum = parseFloat(amount);

    // Validation
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid amount greater than 0",
      });
    }

    if (amountNum > 10000) {
      return res.status(400).json({
        success: false,
        message: "Maximum amount that can be added is ₹10,000",
      });
    }

    if (amountNum < 1) {
      return res.status(400).json({
        success: false,
        message: "Minimum amount that can be added is ₹1",
      });
    }

    // Find user and update wallet balance
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Initialize wallet balance if it doesn't exist
    if (!user.walletBalance) {
      user.walletBalance = 0;
    }

    // Add money to wallet
    user.walletBalance += amountNum;
    await user.save();

    res.json({
      success: true,
      message: "Money added successfully",
      newBalance: user.walletBalance,
      addedAmount: amountNum,
    });
  } catch (error) {
    console.error("Error adding money to wallet:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  loadProfilePage,
  updateProfileOrPassword,
  removeProfileImage,
  sendOTP,
  verifyOTP,
  loadAddressPage,
  addAddress,
  deleteAddress,
  updateAddress,
  loadProfileOrder,
  loadDashboard,
  loadOrderDetails,
  cancelOrder,
  loadWallet,
  addWalletMoney,
  updateProfileImage
};
