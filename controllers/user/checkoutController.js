const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
const cartSchema = require("../../models/cartSchema");
const Cart = require("../../models/cartSchema");

// const loadCheckout = async (req, res) => {
//   try {
//     const userId = req.session.user;
//     if (!userId) return res.redirect("/login");

//     // find user
//     const user = await User.findById(userId);

//     // find addresses
//     const addressDoc = await Address.findOne({ userId });
//     const addressList = addressDoc ? addressDoc.address : [];

//     // find cart
//     const cart = await cartSchema
//       .findOne({ userId })
//       .populate("items.productId");

//     let cartItems = [];
//     let total = 0;

//     if (cart && cart.items.length > 0) {
//       cartItems = cart.items.map((item) => {
//         total += item.productId.salePrice * item.quantity;
//         return {
//           name: item.productId.name,
//           price: item.productId.salePrice,
//           quantity: item.quantity,
//           image: item.productId.productImages[0], 
//         };
//       });
//     }

//     res.render("checkout", {
//       user,
//       addresses: addressList,
//       cartItems,
//       total,
//     });
//   } catch (error) {
//     console.error("Error rendering checkout page", error);
//     res.status(500).send("Server Error");
//   }
// };

let Coupon = null;
try {
  Coupon = require("../models/couponModel"); // Try default path
  console.log("Coupon model loaded successfully from ../models/couponModel");
} catch (err) {
  console.error("Failed to load Coupon model from ../models/couponModel:", err);
  try {
    Coupon = require("./couponModel"); // Try relative to controller
    console.log("Coupon model loaded successfully from ./couponModel");
  } catch (err2) {
    console.error("Failed to load Coupon model from ./couponModel:", err2);
  }
}

const loadCheckout = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) return res.redirect("/login");

    // Find user
    const user = await User.findById(userId);

    // Find addresses
    const addressDoc = await Address.findOne({ userId });
    const addressList = addressDoc ? addressDoc.address : [];

    // Find cart
    const cart = await cartSchema
      .findOne({ userId })
      .populate("items.productId");

    let cartItems = [];
    let subtotal = 0;
    let discount = 0; // Default discount

    if (cart && cart.items.length > 0) {
      cartItems = cart.items.map((item) => {
        const itemSubtotal = item.productId.salePrice * item.quantity;
        subtotal += itemSubtotal;
        return {
          name: item.productId.name,
          price: item.productId.salePrice,
          quantity: item.quantity,
          image: item.productId.productImages[0],
        };
      });

      // Check for applied coupon from session
      const appliedCoupon = req.session.appliedCoupon;
      console.log("Applied coupon from session:", appliedCoupon);
      if (appliedCoupon) {
        // Validate coupon details from session (no model needed for basic check)
        const today = new Date();
        if (appliedCoupon.offerPrice && subtotal >= 0) { // Minimal validation
          discount = appliedCoupon.offerPrice;
        } else {
          console.log("Invalid session coupon or insufficient subtotal");
          delete req.session.appliedCoupon; // Clear invalid coupon
        }
      } else {
        console.log("No applied coupon in session");
      }
    }

    // Grand total = subtotal - discount
    const grandTotal = subtotal - discount;

    res.render("checkout", {
      user,
      addresses: addressList,
      cartItems,
      subtotal,
      discount,
      grandTotal,
    });
  } catch (error) {
    console.error("Error rendering checkout page", error);
    res.status(500).send("Server Error");
  }
};


const placeOrder = async (req, res) => {
  try {
    const userId = req.session.user; 
    const { selectedAddressIndex, paymentMethod } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const addressDoc = await Address.findOne({ userId });
    if (!addressDoc || !addressDoc.address[selectedAddressIndex]) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid delivery address" });
    }
    const deliveryAddress = addressDoc.address[selectedAddressIndex];

    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, error: "Cart is empty" });
    }

    const totalPrice = cart.items.reduce((acc, item) => {
      return acc + item.productId.salePrice * item.quantity;
    }, 0);

    const order = new Order({
      userId,
      items: cart.items.map((item) => ({
        productId: item.productId._id,
        quantity: item.quantity,
        price: item.productId.salePrice,
      })),
      address: deliveryAddress, 
      totalPrice,
      paymentMethod, 
      status: paymentMethod === "COD" ? "Pending" : "Processing",
    });

    await order.save();

    cart.items = [];
    await cart.save();

    return res.status(200).json({
      success: true,
      message: "Order placed successfully",
      orderId: order._id,
      paymentMethod,
    });
  } catch (err) {
    console.error("Error placing order:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

const loadOrder=async(req,res)=>{
  try {
    res.render("orders")
  } catch (error) {
    console.log("error occurred");
    res.status(500).send("Server Error");

  }
}

const cancelOrder = async (req, res) => {
    try {
        const userId = req.session.user;
        const orderId = req.params.id;

        console.log(`Cancel order attempt - User ID: ${userId}, Order ID: ${orderId}`);

        if (!userId) {
            console.log('No user session found');
            return res.status(401).json({ 
                success: false, 
                message: 'Please login first' 
            });
        }

        const order = await Order.findOne({ _id: orderId, userId });

        if (!order) {
            console.log(`Order not found for ID: ${orderId}, User ID: ${userId}`);
            return res.status(404).json({ 
                success: false, 
                message: 'Order not found' 
            });
        }

        console.log(`Order status: ${order.status}`);

        if (order.status === 'Cancelled' || order.status === 'Returned') {
            console.log('Order cannot be cancelled: already Cancelled or Returned');
            return res.status(400).json({ 
                success: false, 
                message: 'Order cannot be cancelled' 
            });
        }

        if (order.status === 'Shipped' || order.status === 'Delivered') {
            console.log('Order cannot be cancelled: already Shipped or Delivered');
            return res.status(400).json({ 
                success: false, 
                message: 'Order cannot be cancelled after shipping' 
            });
        }

        order.status = 'Cancelled';

        const user = await User.findById(userId);
        if (!user) {
            console.log('User not found for ID:', userId);
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        user.walletBalance = user.walletBalance || 0;
        user.walletBalance += order.totalPrice;

        const transaction = new Transaction({
            userId,
            type: 'Credit',
            amount: order.totalPrice,
            date: new Date(),
            description: `Refund for cancelled order #${order.orderId}`
        });

        await Promise.all([order.save(), user.save(), transaction.save()]);
        console.log(`Order ${orderId} cancelled successfully, refunded ₹${order.totalPrice}`);

        res.json({
            success: true,
            message: 'Order cancelled successfully'
        });
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ 
            success: false, 
            message: `Internal server error: ${error.message}` 
        });
    }
};



module.exports = {
  loadCheckout,
  placeOrder,
  loadOrder,
 cancelOrder,
};
