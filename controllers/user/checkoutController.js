const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
const cartSchema = require("../../models/cartSchema");
const Cart = require("../../models/cartSchema");

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
    const orderId = req.params.id;

    console.log(
      `Cancel order attempt - User ID: ${userId}, Order ID: ${orderId}`
    );

    if (!userId) {
      console.log("No user session found");
      return res.status(401).json({
        success: false,
        message: "Please login first",
      });
    }

    const order = await Order.findOne({ _id: orderId, userId });

    if (!order) {
      console.log(`Order not found for ID: ${orderId}, User ID: ${userId}`);
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    console.log(`Order status: ${order.status}`);

    if (order.status === "Cancelled" || order.status === "Returned") {
      console.log("Order cannot be cancelled: already Cancelled or Returned");
      return res.status(400).json({
        success: false,
        message: "Order cannot be cancelled",
      });
    }

    if (order.status === "Shipped" || order.status === "Delivered") {
      console.log("Order cannot be cancelled: already Shipped or Delivered");
      return res.status(400).json({
        success: false,
        message: "Order cannot be cancelled after shipping",
      });
    }

    order.status = "Cancelled";

    const user = await User.findById(userId);
    if (!user) {
      console.log("User not found for ID:", userId);
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.walletBalance = user.walletBalance || 0;
    user.walletBalance += order.totalPrice;

    const transaction = new Transaction({
      userId,
      type: "Credit",
      amount: order.totalPrice,
      date: new Date(),
      description: `Refund for cancelled order #${order.orderId}`,
    });

    await Promise.all([order.save(), user.save(), transaction.save()]);
    console.log(
      `Order ${orderId} cancelled successfully, refunded ₹${order.totalPrice}`
    );

    res.json({
      success: true,
      message: "Order cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling order:", error);
    res.status(500).json({
      success: false,
      message: `Internal server error: ${error.message}`,
    });
  }
};

const createRazorPayOrder = async (req, res) => {
  try {
    const { addressId } = req.body;
    const userId = req.session.user?._id;

    if (!userId)
      return res.json({ success: false, message: "User not logged in" });

    const user = await User.findById(userId).lean();
    if (!user) return res.json({ success: false, message: "User not found" });

    // Calculate total amount from cart session
    let amount = 0;
    if (req.session.cart && req.session.cart.items) {
      req.session.cart.items.forEach((item) => {
        amount += item.price * item.quantity;
      });
    }

    const options = {
      amount: amount * 100, // convert to paise
      currency: "INR",
      receipt: `receipt_order_${Math.floor(Math.random() * 100000)}`,
    };

    const razorpayOrder = await razorpay.orders.create(options);

    // Create order in DB with pending status
    const newOrder = await Order.create({
      userId,
      items: req.session.cart.items,
      address: addressId,
      amount,
      status: "Pending Payment",
    });

    res.json({
      success: true,
      key: process.env.RAZORPAY_KEY_ID,
      amount: razorpayOrder.amount,
      order_id: razorpayOrder.id,
      order: newOrder,
    });
  } catch (err) {
    console.error("Razorpay Order Error:", err);
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to create Razorpay order",
        error: err.message,
      });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = req.body;

    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generated_signature === razorpay_signature) {
      // Payment verified
      await Order.findByIdAndUpdate(orderId, { status: "Confirmed" });
      // Clear user's cart after successful payment
      req.session.cart = { items: [] };
      return res.json({ success: true });
    } else {
      // Verification failed
      await Order.findByIdAndUpdate(orderId, { status: "Payment Failed" });
      return res.json({
        success: false,
        message: "Payment verification failed",
      });
    }
  } catch (err) {
    console.error("Payment Verification Error:", err);
    res
      .status(500)
      .json({
        success: false,
        message: "Payment verification failed",
        error: err.message,
      });
  }
};

module.exports = {
  loadCheckout,
  placeOrder,
  loadOrder,
  cancelOrder,
  createRazorPayOrder,
  verifyPayment,
};
