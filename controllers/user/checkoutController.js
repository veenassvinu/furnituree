const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
const cartSchema = require("../../models/cartSchema");
const Cart = require("../../models/cartSchema");
const Razorpay = require("razorpay"); 
const crypto = require("crypto"); 

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
        if (appliedCoupon.offerPrice && subtotal >= 0) {
          // Minimal validation
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
    // ✅ Fix: Use consistent session variable
    const userId = req.session.user; // Changed from user_id to user
    const { addressId, paymentMethod } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    // Validate input
    if (!addressId || !paymentMethod) {
      return res.status(400).json({ success: false, message: "Address and payment method are required" });
    }

    // Get cart
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    // ✅ Fix: Get address correctly - addressId should be the specific address, not the document
    const addressDoc = await Address.findOne({ userId });
    if (!addressDoc) {
      return res.status(400).json({ success: false, message: "No addresses found for user" });
    }

    // Find the specific address from the addresses array
    const selectedAddress = addressDoc.address.find(addr => addr._id.toString() === addressId);
    if (!selectedAddress) {
      return res.status(400).json({ success: false, message: "Selected address not found" });
    }

    // ✅ Fix: Use salePrice instead of price for calculations
    const items = cart.items.map((item) => ({
      productId: item.productId._id,
      quantity: item.quantity,
      price: item.productId.salePrice, // Changed from price to salePrice
      totalPrice: item.quantity * item.productId.salePrice, // Changed from price to salePrice
    }));

    let totalPrice = items.reduce((acc, i) => acc + i.totalPrice, 0);
    let discount = 0;
    let couponName = null;
    let couponApplied = false;

    // ✅ Fix: Apply coupon discount from session
    const appliedCoupon = req.session.appliedCoupon;
    if (appliedCoupon && appliedCoupon.offerPrice) {
      discount = appliedCoupon.offerPrice;
      couponName = appliedCoupon.couponName || appliedCoupon.name;
      couponApplied = true;
      totalPrice = totalPrice - discount; // Apply discount to total
    }

    const order = new Order({
      userId,
      items,
      totalPrice,
      discount,
      couponName,
      couponApplied,
      address: selectedAddress.toObject(), // Use the selected address
      paymentMethod,
      orderStatus: "Pending",
      paymentStatus: paymentMethod === "COD" ? "Pending" : "Paid",
    });

    await order.save();

    // Clear cart
    await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });

    // Clear applied coupon from session
    if (req.session.appliedCoupon) {
      delete req.session.appliedCoupon;
    }

    res.status(200).json({ success: true, order });
  } catch (err) {
    console.error("Error placing order:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ✅ Create Razorpay Order
const createRazorPayOrder = async (req, res) => {
  try {
    // ✅ Fix: Use consistent session variable
    const userId = req.session.user; // Changed from user_id to user
    const { addressId } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    // Get cart
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    // ✅ Fix: Get address correctly
    const addressDoc = await Address.findOne({ userId });
    if (!addressDoc) {
      return res.status(400).json({ success: false, message: "No addresses found for user" });
    }

    // Find the specific address from the addresses array
    const selectedAddress = addressDoc.address.find(addr => addr._id.toString() === addressId);
    if (!selectedAddress) {
      return res.status(400).json({ success: false, message: "Selected address not found" });
    }

    // ✅ Fix: Use salePrice instead of price
    const items = cart.items.map((item) => ({
      productId: item.productId._id,
      quantity: item.quantity,
      price: item.productId.salePrice, // Changed from price to salePrice
      totalPrice: item.quantity * item.productId.salePrice, // Changed from price to salePrice
    }));

    let totalPrice = items.reduce((acc, i) => acc + i.totalPrice, 0);
    let discount = 0;
    let couponName = null;
    let couponApplied = false;

    // ✅ Fix: Apply coupon discount from session
    const appliedCoupon = req.session.appliedCoupon;
    if (appliedCoupon && appliedCoupon.offerPrice) {
      discount = appliedCoupon.offerPrice;
      couponName = appliedCoupon.couponName || appliedCoupon.name;
      couponApplied = true;
      totalPrice = totalPrice - discount; // Apply discount to total
    }

    // ✅ Create Razorpay Order
    const options = {
      amount: Math.round(totalPrice * 100), // amount in paise, rounded to avoid decimal issues
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    };

    const razorpayOrder = await razorpay.orders.create(options);

    // ✅ Create DB Order with "Pending" payment
    const order = new Order({
      userId,
      items,
      totalPrice,
      discount,
      couponName,
      couponApplied,
      address: selectedAddress.toObject(), // Use the selected address
      paymentMethod: "Razorpay",
      orderStatus: "Pending",
      paymentStatus: "Pending",
      paymentInfo: {
        razorpayOrderId: razorpayOrder.id,
      },
    });

    await order.save();

    res.status(200).json({
      success: true,
      razorpayOrder,
      orderId: order._id,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("🔥 Razorpay Order Error:", err);
    res.status(500).json({ success: false, message: "Failed to create order" });
  }
};

const verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

    // ✅ Fix: Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
      return res.status(400).json({ success: false, message: "Missing required payment details" });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      // ✅ Update Order as Paid
      const order = await Order.findByIdAndUpdate(
        orderId,
        {
          $set: {
            paymentStatus: "Paid",
            "paymentInfo.razorpayPaymentId": razorpay_payment_id,
            "paymentInfo.razorpaySignature": razorpay_signature,
            orderStatus: "Processing", // Move to processing after successful payment
          },
        },
        { new: true }
      );

      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }

      // Clear cart
      await Cart.findOneAndUpdate({ userId: order.userId }, { $set: { items: [] } });

      // Clear applied coupon from session
      if (req.session.appliedCoupon) {
        delete req.session.appliedCoupon;
      }

      return res.json({ success: true, message: "Payment Verified", order });
    } else {
      // ✅ Fix: Update order status to failed payment
      await Order.findByIdAndUpdate(orderId, {
        $set: {
          paymentStatus: "Failed",
          orderStatus: "Cancelled"
        }
      });
      
      return res.status(400).json({ success: false, message: "Invalid Signature" });
    }
  } catch (err) {
    console.error("🔥 Payment Verification Error:", err);
    res.status(500).json({ success: false, message: "Payment verification failed" });
  }
};

const cancelItem = async (req, res) => {
  try {
    const { orderId, itemId, reason } = req.body;

    const order = await Order.findOneAndUpdate(
      { _id: orderId, "items._id": itemId },
      {
        $set: {
          "items.$.status": "Cancelled",
          "items.$.cancelReason": reason,
          "items.$.refundStatus": "Pending",
        },
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ success: false, message: "Order or item not found" });
    }

    res.json({ success: true, order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error cancelling item" });
  }
};

// ✅ Return Item
const returnItem = async (req, res) => {
  try {
    const { orderId, itemId, reason } = req.body;

    const order = await Order.findOneAndUpdate(
      { _id: orderId, "items._id": itemId },
      {
        $set: {
          "items.$.status": "Returned",
          "items.$.returnReason": reason,
          "items.$.refundStatus": "Pending",
        },
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ success: false, message: "Order or item not found" });
    }

    res.json({ success: true, order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error returning item" });
  }
};

const loadOrder = async (req, res) => {
  try {
    res.render("orders");
  } catch (error) {
    console.log("error occurred");
    res.status(500).send("Server Error");
  }
};

const cancelOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const { orderId, reason } = req.body;

    const order = await Order.findOne({ _id: orderId, userId });
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    if (["Shipped", "Delivered"].includes(order.orderStatus)) {
      return res.status(400).json({ success: false, message: "Cannot cancel after shipping" });
    }

    order.orderStatus = "Cancelled";
    order.cancelReason = reason || "No reason provided";

    if (order.paymentStatus === "Paid") {
      order.paymentStatus = "Refund Pending"; // will trigger refund
    }

    await order.save();

    return res.json({ success: true, message: "Order cancelled successfully" });
  } catch (err) {
    console.error("Error cancelling order:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const cancelOrderItem = async (req, res) => {
  try {
    const userId = req.session.user;
    const { orderId, itemId, reason } = req.body;

    const order = await Order.findOne({ _id: orderId, userId });
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const item = order.items.id(itemId);
    if (!item) return res.status(404).json({ success: false, message: "Item not found" });

    if (["Shipped", "Delivered"].includes(item.status)) {
      return res.status(400).json({ success: false, message: "Cannot cancel after shipping" });
    }

    item.status = "Cancelled";
    item.cancelReason = reason || "No reason provided";

    if (order.paymentStatus === "Paid") {
      item.refundStatus = "Pending";
      order.paymentStatus = "Refund Pending";
    }

    // Update orderStatus if all items cancelled
    if (order.items.every(i => i.status === "Cancelled")) {
      order.orderStatus = "Cancelled";
    } else {
      order.orderStatus = "Partially Cancelled";
    }

    await order.save();

    return res.json({ success: true, message: "Item cancelled successfully" });
  } catch (err) {
    console.error("Error cancelling order item:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  loadCheckout,
  placeOrder,
  loadOrder,
  cancelOrder,
  createRazorPayOrder,
  verifyRazorpayPayment,
  cancelItem,
  returnItem,
  cancelOrderItem,
};