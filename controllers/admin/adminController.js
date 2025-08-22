const User=require("../../models/userSchema")
const mongoose=require("mongoose");
const bcrypt=require("bcrypt");


const pageerror=async(req,res)=>{
  try {
    
    res.render("pageerror")
  } catch (error) {
    console.error(error);
    res.redirect('/pageerror')
    
  }}

const loadLogin = (req, res) => {
  if (req.session.admin) {
    return res.redirect("/admin/dashboard");
  }
  res.render("admin-login", { message: null }); // allow message injection
};


// const login = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     const admin = await User.findOne({ email, isAdmin: true });

//     if (!admin) {
//       return res.render("admin-login", {
//         message: "Admin not found. Please check your credentials.",
//       });
//     }

//     const passwordMatch = await bcrypt.compare(password, admin.password);
//     if (!passwordMatch) {
//       return res.render("admin-login", {
//         message: "Incorrect password. Please try again.",
//       });
//     }

//     // Login success
//     req.session.admin = true;
//     req.session.successMessage = "Welcome Admin!";
//     return res.redirect("/admin/dashboard");

//   } catch (error) {
//     console.error("Login error:", error);
//     return res.redirect("/pageerror");
//   }
// };

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await User.findOne({ email, isAdmin: true });

    if (!admin) {
      return res.render("admin-login", {
        emailError: "Admin not found. Please check your email.",
        passwordError: "",
        email, // keep typed email
      });
    }

    const passwordMatch = await bcrypt.compare(password, admin.password);
    if (!passwordMatch) {
      return res.render("admin-login", {
        emailError: "",
        passwordError: "Incorrect password. Please try again.",
        email, // keep typed email
      });
    }

    // Login success
    req.session.admin = true;
    req.session.successMessage = "Welcome Admin!";
    return res.redirect("/admin/dashboard");

  } catch (error) {
    console.error("Login error:", error);
    return res.redirect("/pageerror");
  }
};


const loadDashboard = async (req, res) => {
  if (req.session.admin) {
    try {
      const successMessage = req.session.successMessage;
      req.session.successMessage = null; 
      res.render("adminDashboard", { successMessage });
    } catch (error) {
      console.log("error loading dashboard:", error);
      res.redirect("/pageerror");
    }
  } else {
    res.redirect("/admin/admin-login");
  }
};


const adminLogout = async (req, res) => {
try {
  // Destroy session
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Could not log out' 
      });
    }
    
    // Clear session cookie
    res.clearCookie('connect.sid');  // Adjust cookie name if different
    
    // Send successful logout response
    res.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
});
} catch (error) {
  res.status(500).json({ 
    success: false, 
    message: 'Server error during logout' 
  });
}
}

module.exports={
    loadLogin,
    login,
    loadDashboard,
    pageerror,
    adminLogout,
};