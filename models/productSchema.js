const mongoose=require("mongoose")
const {Schema}=mongoose;


const productsSchema = new Schema({
    productName: {
        type: String,
        required: true,
    },
    originalPrice: {
        type: Number,
        required: true,
    },
    salePrice:{
        type : Number,
        required:true
    },
    category:{
        type:Schema.Types.ObjectId,
        ref:'Category',
        required:true        
        
    },
    productOffer:{
        type:Number,
        default:0
    },
    quantity:{
        type:Number,
        default:0
    },
    color:{
        type:String,
        required:true
    },
    description: {
        type: String,
        required: true,
    },
    productImages: {
        type: [String],
        required:true
    },
    isBlocked:{
        type:Boolean,
        required:true,
        default:false
    },
    status:{
        type:String,
        enum:["Available","out of Stock" , "Discountinued"],
        required:true,
        default:"Available"
    }, 
    
}, { timestamps: true }
);

const Product=mongoose.model("Product",productsSchema);
module.exports=Product;