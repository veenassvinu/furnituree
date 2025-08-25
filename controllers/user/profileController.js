const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const env = require("dotenv").config();
const session = require("express-session");

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
    
    res.render("profile/profile", { userData: user });
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
    
    res.render("profile/dashboard", { userData: user });
  } catch (error) {
    console.error("Error loading dashboard page:", error);
    res.redirect("/pageNotFound");
  }
};

// Update profile or password
const updateProfileOrPassword = async (req, res) => {
  try {
    // Fixed: Use correct session variable (user, not User)
    const userId = req.session.user;
    
    if (!userId) {
      return res.status(401).json({ message: "Please login first" });
    }

    console.log("Update request body:", req.body);
    console.log("User ID:", userId);

    // Password change logic
    if (req.body.currentPassword && req.body.newPassword && req.body.confirmNewPassword) {
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const isMatch = await bcrypt.compare(req.body.currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Verify new password and confirmation match
      if (req.body.newPassword !== req.body.confirmNewPassword) {
        return res.status(400).json({ message: "New passwords do not match" });
      }

      // Validate new password strength
      const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordPattern.test(req.body.newPassword)) {
        return res.status(400).json({ 
          message: "Password must contain at least 8 characters, including uppercase, lowercase, number, and special character" 
        });
      }

      // Hash and save new password
      const hashedPassword = await bcrypt.hash(req.body.newPassword, 10);
      user.password = hashedPassword;
      await user.save();

      return res.status(200).json({ message: "Password updated successfully" });
    }

    // Profile update logic
    const updateFields = {};
    
    // Handle name update
    if (req.body.name !== undefined) {
      const name = req.body.name.trim();
      if (name.length < 2) {
        return res.status(400).json({ message: "Name must be at least 2 characters long" });
      }
      if (!/^[a-zA-Z\s]+$/.test(name)) {
        return res.status(400).json({ message: "Name can only contain letters and spaces" });
      }
      updateFields.name = name;
    }

    // Handle email update
    if (req.body.email !== undefined) {
      const email = req.body.email.trim().toLowerCase();
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      if (!emailPattern.test(email)) {
        return res.status(400).json({ message: "Please enter a valid email address" });
      }

      // Check if email already exists for another user
      const existingUser = await User.findOne({ 
        email: email, 
        _id: { $ne: userId } 
      });
      
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      updateFields.email = email;
    }

    // Handle phone update
    if (req.body.phone !== undefined) {
      const phone = req.body.phone.trim();
      if (phone && !/^\d{10}$/.test(phone)) {
        return res.status(400).json({ message: "Please enter a valid 10-digit phone number" });
      }
      updateFields.phone = phone || null;
    }

    // Update user profile
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
      },
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists` 
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    
    res.status(500).json({ message: "Internal Server Error" });
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
    
    res.render("profile/address", { addresses });
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
        message: "Please login first" 
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

    // Validate required fields
    if (!addressType || !name || !phone || !landMark || !city || !state || !pincode || !country) {
      return res.status(400).json({ 
        success: false, 
        message: "All required fields are necessary" 
      });
    }

    // Validate phone number
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ 
        success: false, 
        message: "Please enter a valid 10-digit phone number" 
      });
    }

    // Validate email if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: "Please enter a valid email address" 
      });
    }

    // Validate pincode
    if (!/^\d{6}$/.test(pincode)) {
      return res.status(400).json({ 
        success: false, 
        message: "Please enter a valid 6-digit pincode" 
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
      email: email || '',
      landMark,
      city,
      state,
      pincode,
      country,
    });

    await addressDoc.save();
    
    res.json({ 
      success: true, 
      message: "Address added successfully" 
    });
  } catch (error) {
    console.error("Error adding address:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
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
        message: "Please login first" 
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
    if (!addressType || !name || !phone || !landMark || !city || !state || !pincode || !country) {
      return res.status(400).json({ 
        success: false, 
        message: "All required fields are necessary" 
      });
    }

    // Validate phone number
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ 
        success: false, 
        message: "Please enter a valid 10-digit phone number" 
      });
    }

    // Validate email if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: "Please enter a valid email address" 
      });
    }

    // Validate pincode
    if (!/^\d{6}$/.test(pincode)) {
      return res.status(400).json({ 
        success: false, 
        message: "Please enter a valid 6-digit pincode" 
      });
    }

    const addressDoc = await Address.findOneAndUpdate(
      { userId, "address._id": addressId },
      {
        $set: {
          "address.$.addressType": addressType,
          "address.$.name": name,
          "address.$.phone": phone,
          "address.$.email": email || '',
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
        message: "Address not found" 
      });
    }

    res.json({ 
      success: true, 
      message: "Address updated successfully" 
    });
  } catch (error) {
    console.error("Error updating address:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
};

// Delete Address Function
const deleteAddress = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: "Please login first" 
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
        message: "User or address not found" 
      });
    }

    res.json({ 
      success: true, 
      message: "Address deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting address:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
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

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = 5; // Increased from 3 for better UX
    const skip = (page - 1) * limit;
    
    console.log(`Orders page - User ID: ${userId}, Page: ${page}, Skip: ${skip}, Limit: ${limit}`);

    // Fetch total orders count and paginated orders
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
    
    console.log(`Total Pages: ${totalPages}, Has Prev: ${hasPrevPage}, Has Next: ${hasNextPage}`);

    res.render("profile/profileorder", {
      orders,
      currentPage: page,
      totalPages,
      hasNextPage,
      hasPrevPage,
    });
  } catch (error) {
    console.error("Error in loadProfileOrder:", error);
    res.status(500).render("error", { 
      message: "Error loading orders page" 
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
    
    res.render("profile/wallet", { userData: user });
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
        message: "Please login first" 
      });
    }

    const { amount } = req.body;
    const amountNum = parseFloat(amount);

    // Validation
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Please enter a valid amount greater than 0" 
      });
    }

    if (amountNum > 10000) {
      return res.status(400).json({ 
        success: false, 
        message: "Maximum amount that can be added is ₹10,000" 
      });
    }

    if (amountNum < 1) {
      return res.status(400).json({ 
        success: false, 
        message: "Minimum amount that can be added is ₹1" 
      });
    }

    // Find user and update wallet balance
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // Initialize wallet balance if it doesn't exist
    if (!user.walletBalance) {
      user.walletBalance = 0;
    }

    // Add money to wallet
    user.walletBalance += amountNum;
    await user.save();

    // TODO: Add transaction history record here
    // You can create a separate Transaction model for this

    res.json({
      success: true,
      message: "Money added successfully",
      newBalance: user.walletBalance,
      addedAmount: amountNum
    });

  } catch (error) {
    console.error("Error adding money to wallet:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
};

module.exports = {
  loadProfilePage,
  updateProfileOrPassword,
  loadAddressPage,
  addAddress,
  deleteAddress,
  updateAddress,
  loadProfileOrder,
  loadDashboard,
  loadWallet,
  addWalletMoney,
};