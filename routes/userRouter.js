const express=require("express");
const router=express.Router();
const userController=require("../controllers/user/userController");
const passport = require("passport");
// const forgotPasswordController=require("../controllers/user/forgotPasswordController.js")
const checkBan=require("../middlewares/checkBan.js");
const categoryController=require("../controllers/user/cartCotroller.js")

const {userAuth,already} = require('../middlewares/auth');
const { getForgotPassPage } = require("../controllers/user/forgotPasswordController.js");

// Banned Page
router.get("/banned", (req, res) => {
  res.render("checkBan"); // render bannedPage.ejs
});


router.get("/pageNotFound",userController.pageNotFound)
router.get("/",already,checkBan,userController.loadHomepage);
router.get('/signup',userController.loadSignUp);
router.post('/signup',userController.signup);
router.get('/verify',userController.loadOtpPage);
router.post('/verify',already,userController.verifyOtp); 
router.post('/resend-otp',userController.sendOtpEmail);
router.post("/resend-otp",already,userController.resendOtp);

router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}));

router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    res.redirect('/')
});
router.get('/login',checkBan,userController.loadLogin);
router.post('/login',userController.login);
router.get('/shop',checkBan,userController.loadShopPage);
// router.get('/productDetails/:id',userController.productDetails);

router.get('/productDetails/:id([a-fA-F0-9]{24})', userController.productDetails);


router.get('/logout', async (req,res)=>{
    try {
        req.session.destroy((err)=>{
            if(err){
                console.log("logout Error")
            }else{
                res.redirect('/login')
            }
        })
    } catch (error) {
        
    }
})


router.get('/cart',userAuth,categoryController.cartPage);

//forgot password//

// router.get("/forgot-password", forgotPasswordController.getForgotPassPage);
// router.post("/forgot-email-otp", forgotPasswordController.sendForgotOtp);
// router.post("/verify-forgot-otp", forgotPasswordController.verifyForgotOtp);
// router.post("/resend-otp", forgotPasswordController.resendOtp);
// router.get("/enter-otp", forgotPasswordController.loadEmailPage);



// router.get("/about-us", userController.aboutUsPage);









module.exports=router;