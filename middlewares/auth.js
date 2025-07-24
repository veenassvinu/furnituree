const User=require("../models/userSchema");


const userAuth = async (req, res, next) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      console.log("User ID from session: undefined");
      return res.redirect("/login");
    }

    const user = await User.findById(userId);

    
    if (!user) {
      req.session.destroy(() => {
        return res.redirect("/login");
      });
      return;
    }

    if (user.isBlocked) {
      req.session.destroy(() => {
        return res.redirect("/banned"); 
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


  try {
    if(req.session.admin){
      next()
    }else{
      res.redirect('/admin/admin-login')
    }
  } catch (error) {
    
  }
}

module.exports={
    userAuth,
    adminAuth,
    already
}

