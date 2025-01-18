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



const loadLogin=(req,res)=>{
    if(req.session.admin){
        return res.redirect("/admin/dashboard")
    }
    res.render("admin-login",{message:null})
}
const login = async (req, res) => {
    try {
      console.log('Login method hit');
      const { email, password } = req.body;
      console.log('Email:', email, 'Password:', password);
  
      const admin = await User.findOne({ email, isAdmin: true });
      if (admin) {
        const passwordMatch = await bcrypt.compare(password, admin.password);
        if (passwordMatch) {
          req.session.admin = true;
          return res.redirect('/admin');
        } else {
          console.log('Password mismatch');
          return res.redirect('/admin-login');
        }
      } else {
        console.log('Admin not found');
        return res.redirect('/admin-login');
      }
    } catch (error) {
      console.log('Login error:', error);
      return res.redirect('/pageerror');
    }
  };
  
  
const loadDashboard=async(req,res)=>{
    if(req.session.admin){
        try {
            res.render("Dashboard")
        } catch (error) {
            console.log("error loading dashboard:",error);
            
          res.redirect("/pageerror")  
        }
    // }else{
    //     res.redirect("admin-login")
    }
};

const logout=async (req,res)=>{
    try {
        req.session.destroy(err=>{
            if(err){
                console.log("Error destroying session",err);
                return res.redirect("/pageerror")
            }
            res.redirect("/admin/admin-login")
        })
    } catch (error) {
        console.log("unexpected error during logout",error);
        res.redirect("/pageerror")
        
    }
}



module.exports={
    loadLogin,
    login,
    loadDashboard,
    pageerror,
    logout,
};