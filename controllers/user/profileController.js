const User=require("../../models/userSchema");
const nodemailer=require("nodemailer");
const bcrypt=require("bcrypt");
const env=require("dotenv").config();
const session=require("express-session");




// Load profile page
const loadProfilePage = async (req, res) => {
  try {
    console.log("User ID from session:", req.session.User);
    const user = await User.findById(req.session.User);
    console.log("User found:", user);
    res.render("user/userProfile", { userData: user });
  } catch (error) {
    console.error("Error loading profile page:", error);
    res.redirect("/pageNotFound");
  }
};

// Update profile or password
const updateProfileOrPassword = async (req, res) => {
  try {
    const userId = req.session.User;

    // Password change
    if (req.body.currentPassword && req.body.newPassword) {
      const user = await User.findById(userId);

      const isMatch = await bcrypt.compare(req.body.currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Incorrect current password" });
      }

      const hashedPassword = await bcrypt.hash(req.body.newPassword, 10);
      user.password = hashedPassword;
      await user.save();

      return res.status(200).json({ message: "Password updated successfully" });
    }

    // Profile update
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        username: req.body.name,
        phone: req.body.phone,
      },
      { new: true }
    );

    return res.status(200).json({
      message: "Profile updated successfully",
      user: {
        username: updatedUser.username,
        phone: updatedUser.phone,
      },
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = {
  loadProfilePage,
  updateProfileOrPassword,
};
