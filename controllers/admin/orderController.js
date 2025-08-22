const Order=require("../../models/orderSchema")


const loadOrder=async(req,res)=>{
    try {
        res.render("adminorder")
    } catch (error) {

     console.error("Error rendering order page");
    res.status(500).send("Server Error");
  }
    
}

module.exports={
    loadOrder,
}
