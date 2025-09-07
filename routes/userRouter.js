const express=require("express");
const router=express.Router();
const userController=require("../controllers/user/userController");
const passport = require("passport");
const forgotPasswordController=require("../controllers/user/forgotPasswordController.js")
const checkBan=require("../middlewares/checkBan.js");
const categoryController=require("../controllers/user/cartController.js")

const {userAuth,already} = require('../middlewares/auth');
const { getForgotPassPage } = require("../controllers/user/forgotPasswordController.js");
const profileController=require("../controllers/user/profileController.js")
const cartController=require("../controllers/user/cartController.js")
const aboutController = require('../controllers/user/aboutController.js')
const checkoutController=require('../controllers/user/checkoutController.js')

// ---------Banned Page--------//

router.get("/banned", (req, res) => {
  res.render("checkBan"); 
});


router.get("/",already,checkBan,userController.loadHomepage);
router.get('/signup',userController.loadSignUp);
router.post('/signup',userController.signup);
router.get('/verify',userController.loadOtpPage);
router.post('/verify',already,userController.verifyOtp); 
router.post('/resend-otp',userController.sendOtpEmail);
router.post("/resend-otp",already,userController.resendOtp);


router.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/signup' }),
  (req, res) => {
    req.session.user = req.user._id;

    res.redirect('/');
  }
);

router.get('/auth/google', (req, res, next) => {
  if (req.session.user) {
    return res.redirect('/'); 
  }
  next();
}, passport.authenticate('google', { scope: ['profile', 'email'] }));





router.get('/login',checkBan,userController.loadLogin);
router.post('/login',userController.login);
router.get('/shop',checkBan,userController.loadShopPage);

router.get('/productDetails/:id([a-fA-F0-9]{24})', userController.productDetails);




// --------------Profile Section -------------- //

router.get('/profile' , profileController.loadProfilePage)
router.get('/dashboard' , profileController.loadDashboard)
router.get('/address',profileController.loadAddressPage);
router.post('/save-address', profileController.addAddress);
router.put('/update-address/:id', profileController.updateAddress);
router.delete('/delete-address/:id', profileController.deleteAddress);
router.get('/profileorder',profileController.loadProfileOrder)
router.put('/profile/profile', profileController.updateProfileOrPassword);
router.get('/orders/:id([a-fA-F0-9]{24})', userAuth, profileController.loadOrderDetails);
router.post('/orders/:id([a-fA-F0-9]{24})/cancel', userAuth, profileController.cancelOrder);
router.get('/wallet', profileController.loadWallet);           
router.post('/profile/add-wallet-money', profileController.addWalletMoney); 
 





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


//---------------cart section-----------//

router.get("/cart", cartController.loadCartPage);
router.post("/add-to-cart/:productId", cartController.addToCart);
router.delete("/remove-from-cart/:id", cartController.removeFromCart);
router.put("/update-cart-quantity", cartController.updateQuantity);
router.get("/get-product-stock/:productId", cartController.getProductStock);
router.get("/get-cart-count", cartController.getCartCount);
router.get("/update-time", cartController.updateTime);


//--------------forgot password-----------//

router.get("/forgot-password", forgotPasswordController.getForgotPasswordPage);
router.post("/forgot-email-otp", forgotPasswordController.sendForgotOtp);
router.get("/enter-otp", forgotPasswordController.loadEmailPage);
router.post("/verify-forgot-otp", forgotPasswordController.verifyForgotOtp);
router.post("/resend-otp", forgotPasswordController.resendOtp);
router.get("/reset-password", forgotPasswordController.getResetPasswordPage);
router.post("/updatePassword", forgotPasswordController.updatePassword);


router.get("/about-us", aboutController.aboutUsPage);
router.get('/contact',userController.loadContactPage)




//---------orders-------//
router.get('/checkout',checkoutController.loadCheckout);
router.get('/orders',checkoutController.loadOrder)
router.post("/place-order", checkoutController.placeOrder);
router.get('/orders/:id/cancel',checkoutController.cancelOrder);


module.exports=router;