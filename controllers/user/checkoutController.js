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


const placeOrder = async (req, res) => {
  try {
    const { selectedAddressIndex, paymentMethod } = req.body;

    if (!user || !user.address || !user.address[selectedAddressIndex]) {
      return res.status(400).json({ message: "Invalid address" });
    }

    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, error: "Cart is empty" });
    }

    // Calculate total price
    const totalPrice = cart.items.reduce((acc, item) => {
      return acc + item.productId.price * item.quantity;
    }, 0);

    // ✅ Fetch addresses from Address collection
    const addressDoc = await Address.findOne({ userId });
    console.log("Address", addressDoc);

    if (!addressDoc || !addressDoc.address[selectedAddressIndex]) {
      return res.status(400).json({ success: false, error: "Invalid address" });
    }

    const order = new Order({
      userId,
      items: cart.items.map((item) => ({
        productId: item.productId._id,
        quantity: item.quantity,
        price: item.productId.price,
      })),
      address: addressDoc.address[selectedAddressIndex], // ✅ Correct source
      totalPrice,
      paymentMethod,
      status: "Pending",
      createdAt: new Date(),
    });

    await order.save();

    // Clear cart
    cart.items = [];
    await cart.save();

    res.status(200).json({
      success: true,
      message: "Order placed successfully",
      orderId: order._id,
    });
  } catch (err) {
    console.error("Error placing order:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  loadCheckout,
  placeOrder,
};
