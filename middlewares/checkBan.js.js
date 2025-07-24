const User = require("../models/userSchema");

const checkBan = async (req, res, next) => {
  try {
   
    if (!req.session.user) {
      return next(); 
    }

    
    const user = await User.findById(req.session.user);

    if (!user) {
     
      req.session.destroy((err) => {
        if (err) console.error("Error destroying session:", err);
        return res.redirect("/login");
      });
    } else if (user.isBlocked) {
      
      req.session.destroy((err) => {
        if (err) console.error("Error destroying session:", err);
        return res.redirect("/banned");
      });
    } else {
      next(); 
    }
  } catch (error) {
    console.error("Error in checkBan middleware:", error);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = checkBan;
