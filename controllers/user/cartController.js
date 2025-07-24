// const cart=require("../../models/cartSchema");
const User=require("../../models/userSchema")
const bcrypt = require("bcrypt");



// const loadCartPage = async (req, res) => {
//   try {
//     const userId = req.session.userId;
//     console.log("User ID from session:", userId);

//     if (!userId) return res.redirect("/login");

//     const user = await User.findById(userId);
//     if (!user) return res.redirect("/login");

//     const cartItems = await Cart.find({ userId }).populate("products.productId");

//     res.render("cart", {
//       user,
//       cartItems
//     });
//   } catch (err) {
//     console.error("Error loading cart:", err);
//     res.status(500).send("Internal Server Error");
//   }
// };

const loadCartPage = async(req,res)=>{
  res.render('cart')
}





module.exports={
  loadCartPage,
  
}