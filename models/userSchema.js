const mongoose=require("mongoose");
const Wishlist = require("./wishlistSchema");
const {Schema}=mongoose;

const userSchema=new Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true,
    },
    phone:{
        type:String,
        required:false,
        unique:false,
        sparse:true,
        default:null
    },
    googleId:{
        type:String,
        unique:true
    },
    password:{
        type:String,
        required:false
    },
    isAdmin:{
        type:Boolean,
        default:false
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    cart:[{
        type:Schema.Types.ObjectId,
        ref:"Cart",
    }],
    wallet:[{
        type:Schema.Types.ObjectId,
    }],
    Wishlist:[{
        type:Schema.Types.ObjectId,
        ref:"wishlist"
    }],
    
})

const User=mongoose.model("User",userSchema);
module.exports=User;