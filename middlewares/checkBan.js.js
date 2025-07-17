const User = require("../models/userSchema");

const checkBan = async (req, res, next) => {
  try {
    // Check if the user session exists
    if (!req.session.user) {
      return next(); // No session — proceed normally
    }

    // Fetch user from DB
    const user = await User.findById(req.session.user);

    if (!user) {
      // User not found — clear session and redirect to login
      req.session.destroy((err) => {
        if (err) console.error("Error destroying session:", err);
        return res.redirect("/login");
      });
    } else if (user.isBlocked) {
      // Blocked user — destroy session and redirect to banned page
      req.session.destroy((err) => {
        if (err) console.error("Error destroying session:", err);
        return res.redirect("/banned"); // 👈 Prefer a route instead of res.render directly
      });
    } else {
      next(); // User is fine, proceed
    }
  } catch (error) {
    console.error("Error in checkBan middleware:", error);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = checkBan;
