const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const env = require("dotenv").config();
const session = require("express-session");

// Load profile page
const loadProfilePage = async (req, res) => {
  try {
    console.log("User ID from session:", req.session.user);
    const user = await User.findById(req.session.user);
    console.log("User found:", user);
    res.render("profile/profile", { userData: user });
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

      const isMatch = await bcrypt.compare(
        req.body.currentPassword,
        user.password
      );
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




const loadAddressPage = async (req, res) => {
    try {
        const userId = req.session.user;
        console.log(userId)
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
module.exports = { loadAddressPage };

const addAddress = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Please login first" });
        }

        const { addressType, name, phone, email, landMark, city, state, pincode, country } = req.body;

        if (!addressType || !name || !phone || !landMark || !city || !state || !pincode || !country) {
            return res.status(400).json({ success: false, message: "All required fields are necessary" });
        }

        let addressDoc = await Address.findOne({ userId });
        if (!addressDoc) {
            addressDoc = new Address({ userId, address: [] });
        }

        addressDoc.address.push({
            addressType,
            name,
            phone,
            email,
            landMark,
            city,
            state,
            pincode,
            country
        });

        await addressDoc.save();
        res.json({ success: true, message: "Address added successfully" });
    } catch (error) {
        console.error("Error adding address:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Update Address Function
const updateAddress = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Please login first" });
        }

        const addressId = req.params.id;
        const { addressType, name, phone, email, landMark, city, state, pincode, country } = req.body;

        if (!addressType || !name || !phone || !landMark || !city || !state || !pincode || !country) {
            return res.status(400).json({ success: false, message: "All required fields are necessary" });
        }

        const addressDoc = await Address.findOneAndUpdate(
            { userId, "address._id": addressId },
            {
                $set: {
                    "address.$.addressType": addressType,
                    "address.$.name": name,
                    "address.$.phone": phone,
                    "address.$.email": email,
                    "address.$.landMark": landMark,
                    "address.$.city": city,
                    "address.$.state": state,
                    "address.$.pincode": pincode,
                    "address.$.country": country
                }
            },
            { new: true }
        );

        if (!addressDoc) {
            return res.status(404).json({ success: false, message: "Address not found" });
        }

        res.json({ success: true, message: "Address updated successfully" });
    } catch (error) {
        console.error("Error updating address:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Delete Address Function
const deleteAddress = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Please login first" });
        }

        const addressId = req.params.id;

        const addressDoc = await Address.findOneAndUpdate(
            { userId },
            { $pull: { address: { _id: addressId } } },
            { new: true }
        );

        if (!addressDoc) {
            return res.status(404).json({ success: false, message: "Address not found" });
        }

        res.json({ success: true, message: "Address deleted successfully" });
    } catch (error) {
        console.error("Error deleting address:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

module.exports = { loadAddressPage, addAddress, updateAddress, deleteAddress };


module.exports = {
  loadProfilePage,
  updateProfileOrPassword,
  loadAddressPage,
  addAddress,
  deleteAddress,
  updateAddress,
};
