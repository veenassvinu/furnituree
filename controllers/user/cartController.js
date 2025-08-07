// const cart=require("../../models/cartSchema");
const User=require("../../models/userSchema")
const bcrypt = require("bcrypt");



const loadCartPage = async(req,res)=>{
  res.render('cart')
}



module.exports={
  loadCartPage,
  
}