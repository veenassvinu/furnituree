const product=require('../../models/productSchema');

const loadOffer=async(req,res)=>{
    try {
        res.render('offer-management')
    } catch (error) {
    console.error("Error rendering About Us page:", error.message);
    res.status(500).send("Server Error");
  }
}

module.exports={
    loadOffer,
}