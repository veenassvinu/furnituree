const User=require("../models/userSchema");


const userAuth = async (req, res, next) => {
  try {
    const userId = req.session.userId;

    // If no user session, redirect to login
    if (!userId) {
      return res.redirect("/login");
    }

    const user = await User.findById(userId);

    // If user doesn't exist or got deleted
    if (!user) {
      req.session.destroy(() => {
        return res.redirect("/login");
      });
      return;
    }

    // If user is blocked, destroy session and redirect to banned page
    if (user.isBlocked) {
      req.session.destroy(() => {
        return res.redirect("/banned"); // 👈 Redirect to banned page
      });
      return;
    }

    next();
  } catch (error) {
    console.error("Authentication Error:", error.message);
    return res.redirect("/login");
  }
};


const already = async (req, res, next) => {
    if (req.session.User) {
      return res.redirect("/");
    }
    next();
  };

const adminAuth=(req,res,next)=>{
    User.findOne({isAdmin:true})
    .then(data=>{
        if(data){
            next();
        }else{
            res.redirect("/admin/admin-login")
        }
    })
   .catch(error=>{
    console.log("Error in adminauth middleware",error);
    res.status(500).send("Interanal Server error")
    
   }) 
}

module.exports={
    userAuth,
    adminAuth,
    already
}

