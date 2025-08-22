const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
const cartSchema = require("../../models/cartSchema");
const Cart = require("../../models/cartSchema");

const loadCheckout = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) return res.redirect("/login");

    // find user
    const user = await User.findById(userId);

    // find addresses
    const addressDoc = await Address.findOne({ userId });
    const addressList = addressDoc ? addressDoc.address : [];

    // find cart
    const cart = await cartSchema
      .findOne({ userId })
      .populate("items.productId");

    let cartItems = [];
    let total = 0;

    if (cart && cart.items.length > 0) {
      cartItems = cart.items.map((item) => {
        total += item.productId.salePrice * item.quantity; // using salePrice
        return {
          name: item.productId.name,
          price: item.productId.salePrice,
          quantity: item.quantity,
          image: item.productId.productImages[0], // take first image
        };
      });
    }

    res.render("checkout", {
      user,
      addresses: addressList,
      cartItems,
      total,
    });
  } catch (error) {
    console.error("Error rendering checkout page", error);
    res.status(500).send("Server Error");
  }
};

// const placeOrder = async (req, res) => {
//   try {
//     const userId = req.session.user;
//     const { selectedAddress, paymentMethod } = req.body;

//     if (!userId) {
//       return res.status(401).json({ message: "User not logged in" });
//     }

//     const cart = await Cart.findOne({ userId }).populate("items.productId");
//     if (!cart || cart.items.length === 0) {
//       return res.status(400).json({ message: "Cart is empty" });
//     }

//     // Calculate total price
//     const totalPrice = cart.items.reduce((acc, item) => {
//       return acc + item.productId.price * item.quantity;
//     }, 0);

//     const user = await User.findById(userId);

//     console.log("User object:", user);
//     console.log("Selected address index:", selectedAddress);
//     console.log("User addresses:", user.address);

//     if (!user || !user.addresses || !user.address[selectedAddress]) {
//       return res.status(400).json({ message: "Invalid address" });
//     }

//     const order = new Order({
//       userId,
//       items: cart.items.map(item => ({
//         productId: item.productId._id,
//         quantity: item.quantity,
//         price: item.productId.price
//       })),
//       address: user.address[selectedAddress],  // ✅ Safe
//       totalPrice: totalPrice,
//       paymentMethod,
//       status: "Pending",
//       createdAt: new Date()
//     });

//     await order.save();

//     // clear cart
//     cart.items = [];
//     await cart.save();

//     res.status(200).json({ message: "Order placed successfully", orderId: order._id });

//   } catch (err) {
//     console.error("Error placing order:", err);
//     res.status(500).json({ message: "Error placing order", error: err.message });
//   }
// };


// const placeOrder = async (req, res) => {
//   try {
//     const { selectedAddressIndex, paymentMethod } = req.body;

//     if (!user || !user.address || !user.address[selectedAddressIndex]) {
//       return res.status(400).json({ message: "Invalid address" });
//     }

//     const cart = await Cart.findOne({ userId }).populate("items.productId");
//     if (!cart || cart.items.length === 0) {
//       return res.status(400).json({ success: false, error: "Cart is empty" });
//     }

//     // Calculate total price
//     const totalPrice = cart.items.reduce((acc, item) => {
//       return acc + item.productId.price * item.quantity;
//     }, 0);

//     // ✅ Fetch addresses from Address collection
//     const addressDoc = await Address.findOne({ userId });
//     console.log("Address", addressDoc);

//     if (!addressDoc || !addressDoc.address[selectedAddressIndex]) {
//       return res.status(400).json({ success: false, error: "Invalid address" });
//     }

//     const order = new Order({
//       userId,
//       items: cart.items.map((item) => ({
//         productId: item.productId._id,
//         quantity: item.quantity,
//         price: item.productId.price,
//       })),
//       address: addressDoc.address[selectedAddressIndex], // ✅ Correct source
//       totalPrice,
//       paymentMethod,
//       status: "Pending",
//       createdAt: new Date(),
//     });

//     await order.save();

//     // Clear cart
//     cart.items = [];
//     await cart.save();

//     res.status(200).json({
//       success: true,
//       message: "Order placed successfully",
//       orderId: order._id,
//     });
//   } catch (err) {
//     console.error("Error placing order:", err);
//     res.status(500).json({ success: false, error: err.message });
//   }
// };
const placeOrder = async (req, res) => {
  try {
    const userId = req.session.user; // ✅ assuming user session holds userId
    const { selectedAddressIndex, paymentMethod } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    // ✅ Fetch user addresses
    const addressDoc = await Address.findOne({ userId });
    if (!addressDoc || !addressDoc.address[selectedAddressIndex]) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid delivery address" });
    }
    const deliveryAddress = addressDoc.address[selectedAddressIndex];

    // ✅ Fetch cart
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, error: "Cart is empty" });
    }

    // ✅ Calculate total
    const totalPrice = cart.items.reduce((acc, item) => {
      return acc + item.productId.salePrice * item.quantity;
    }, 0);

    // ✅ Create new order
    const order = new Order({
      userId,
      items: cart.items.map((item) => ({
        productId: item.productId._id,
        quantity: item.quantity,
        price: item.productId.salePrice,
      })),
      address: deliveryAddress, // save full snapshot
      totalPrice,
      paymentMethod, // e.g., COD
      status: paymentMethod === "COD" ? "Pending" : "Processing",
    });

    await order.save();

    // ✅ Clear cart after placing order
    cart.items = [];
    await cart.save();

    // ✅ Response
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
// const loadProfileOrders = async (req, res) => {
//   try {
//     const userId = req.session.user;
//     if (!userId) return res.redirect("/login");

//     const orders = await Order.find({ userId }).sort({ createdAt: -1 }).populate("items.productId");

//     res.render("profileorder", { orders });
//   } catch (err) {
//     console.error("Error loading orders:", err);
//     res.status(500).send("Server Error");
//   }
// };

module.exports = {
  loadCheckout,
  placeOrder,
  loadOrder,
  // loadProfileOrders
};
