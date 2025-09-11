const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const Coupon = require("../../models/couponSchema");
const mongoose = require("mongoose");

// Helper to calculate cart count
const calculateCartCount = (cart) => {
  if (!cart || !cart.items) return 0;
  return cart.items.reduce((sum, item) => sum + item.quantity, 0);
};

// GET cart page
const loadCartPage = async (req, res) => {
  try {
    const userId = req.session.user;
    console.log("User ID in session:", userId);

    // Initialize defaults
    let cartItems = [];
    let totalPrice = 0;
    let cartCount = 0;
    let appliedCoupon = null;
    let discount = 0;
    let error = null;
    let availableCoupons = [];

    if (!userId) {
      error = "Please log in to view your cart";
      return res.status(401).render("cart", { cartItems, totalPrice, cartCount, appliedCoupon, discount, error, availableCoupons });
    }

    const cart = await Cart.findOne({ userId }).populate("items.productId");

    if (cart && cart.items.length > 0) {
      cartItems = cart.items.map((item) => {
        if (!item.productId) {
          console.warn(`Invalid productId for cart item: ${item._id}`);
          return null;
        }
        const total = item.quantity * item.productId.salePrice;
        totalPrice += total;
        return {
          _id: item.productId._id,
          productName: item.productId.productName,
          price: item.productId.salePrice,
          quantity: item.quantity,
          image: item.productId.productImages[0],
          total,
          stock: item.productId.quantity
        };
      }).filter(item => item !== null);
      cartCount = calculateCartCount(cart);
    }

    // Check for applied coupon
    appliedCoupon = req.session.appliedCoupon || null;
    if (appliedCoupon) {
      const coupon = await Coupon.findOne({ name: appliedCoupon.name, isDeleted: false });
      if (coupon && coupon.createOn <= new Date() && coupon.expireOn >= new Date() && totalPrice >= coupon.minimumPrice) {
        discount = coupon.offerPrice;
        totalPrice -= discount;
      } else {
        req.session.appliedCoupon = null;
        appliedCoupon = null;
      }
    }

    // Fetch available coupons
    availableCoupons = await Coupon.find({
      isDeleted: false,
      createOn: { $lte: new Date() },
      expireOn: { $gte: new Date() }
    }).select('_id name');

    res.render("cart", { cartItems, totalPrice, cartCount, appliedCoupon, discount, error, availableCoupons });
  } catch (error) {
    console.error("Error loading cart:", error);
    res.status(500).render("cart", {
      cartItems: [],
      totalPrice: 0,
      cartCount: 0,
      appliedCoupon: null,
      discount: 0,
      error: "Error loading cart",
      availableCoupons: []
    });
  }
};

// Add to cart
const addToCart = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Please log in first" });
    }

    const productId = req.params.productId;
    const quantity = parseInt(req.body.quantity) || 1;

    if (isNaN(quantity) || quantity < 1) {
      return res.status(400).json({ success: false, message: "Quantity must be a positive number" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (product.quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.quantity} items available in stock`
      });
    }

    const price = product.salePrice;
    if (typeof price !== "number" || isNaN(price) || price < 0) {
      return res.status(400).json({ success: false, message: "Invalid product price" });
    }

    const totalPrice = price * quantity;

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({
        userId,
        items: [{ productId, quantity, price, totalPrice }],
      });
    } else {
      const itemIndex = cart.items.findIndex(
        (item) => item.productId.toString() === productId
      );

      if (itemIndex > -1) {
        const newQuantity = cart.items[itemIndex].quantity + quantity;
        if (newQuantity > product.quantity) {
          return res.status(400).json({
            success: false,
            message: `Cannot add more items. Only ${product.quantity} items available in stock`
          });
        }
        cart.items[itemIndex].quantity = newQuantity;
        cart.items[itemIndex].totalPrice = newQuantity * price;
      } else {
        cart.items.push({ productId, quantity, price, totalPrice });
      }
    }

    await cart.save();

    const updatedCart = await Cart.findOne({ userId }).populate("items.productId");
    let cartItems = [];
    let cartTotalPrice = 0;

    if (updatedCart && updatedCart.items.length > 0) {
      cartItems = updatedCart.items.map((item) => {
        if (!item.productId) {
          console.warn(`Invalid productId for cart item: ${item._id}`);
          return null;
        }
        const total = item.quantity * item.productId.salePrice;
        cartTotalPrice += total;
        return {
          _id: item.productId._id,
          productName: item.productId.productName,
          price: item.productId.salePrice,
          quantity: item.quantity,
          image: item.productId.productImages[0],
          total,
          stock: item.productId.quantity
        };
      }).filter(item => item !== null);
    }

    const cartCount = calculateCartCount(updatedCart);

    // Revalidate applied coupon
    let discount = 0;
    let appliedCoupon = req.session.appliedCoupon || null;
    if (appliedCoupon) {
      const coupon = await Coupon.findOne({ name: appliedCoupon.name, isDeleted: false });
      if (coupon && coupon.createOn <= new Date() && coupon.expireOn >= new Date() && cartTotalPrice >= coupon.minimumPrice) {
        discount = coupon.offerPrice;
        cartTotalPrice -= discount;
      } else {
        req.session.appliedCoupon = null;
        appliedCoupon = null;
      }
    }

    res.json({
      success: true,
      message: "Item added to cart successfully",
      cartCount,
      cartItems,
      totalPrice: cartTotalPrice,
      discount,
      appliedCoupon
    });
  } catch (error) {
    console.error("Add to cart error:", error);
    res.status(500).json({ success: false, message: "Something went wrong", error: error.message });
  }
};

// Remove from cart
const removeFromCart = async (req, res) => {
  try {
    const userId = req.session.user;
    const productId = req.params.id;

    if (!userId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: "Invalid user or product ID" });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: "Item not found in cart" });
    }

    cart.items.splice(itemIndex, 1);
    await cart.save();

    const updatedCart = await Cart.findOne({ userId }).populate("items.productId");
    let totalPrice = 0;
    let cartItems = [];

    if (updatedCart && updatedCart.items.length > 0) {
      cartItems = updatedCart.items.map((item) => {
        if (!item.productId) {
          console.warn(`Invalid productId for cart item: ${item._id}`);
          return null;
        }
        const total = item.quantity * item.productId.salePrice;
        totalPrice += total;
        return {
          _id: item.productId._id,
          productName: item.productId.productName,
          price: item.productId.salePrice,
          quantity: item.quantity,
          image: item.productId.productImages[0],
          total,
          stock: item.productId.quantity
        };
      }).filter(item => item !== null);
    }

    const cartCount = calculateCartCount(updatedCart);

    // Revalidate applied coupon
    let discount = 0;
    let appliedCoupon = req.session.appliedCoupon || null;
    if (appliedCoupon) {
      const coupon = await Coupon.findOne({ name: appliedCoupon.name, isDeleted: false });
      if (coupon && coupon.createOn <= new Date() && coupon.expireOn >= new Date() && totalPrice >= coupon.minimumPrice) {
        discount = coupon.offerPrice;
        totalPrice -= discount;
      } else {
        req.session.appliedCoupon = null;
        appliedCoupon = null;
      }
    }

    res.json({
      success: true,
      message: "Item removed from cart successfully",
      totalPrice,
      cartCount,
      cartItems,
      discount,
      appliedCoupon
    });
  } catch (error) {
    console.error("Remove from cart error:", error);
    res.status(500).json({ success: false, message: "Failed to remove item from cart" });
  }
};

// Update quantity with stock validation
const updateQuantity = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.session.user;

    if (!userId || !productId || !quantity) {
      return res.status(400).json({ success: false, message: "Invalid input" });
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 1) {
      return res.status(400).json({ success: false, message: "Quantity must be a positive number" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (qty > product.quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.quantity} items available in stock`,
        availableStock: product.quantity
      });
    }

    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }

    const item = cart.items.find(item => item.productId._id.toString() === productId);
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found in cart" });
    }

    item.quantity = qty;
    item.totalPrice = qty * item.productId.salePrice;
    await cart.save();

    let totalPrice = 0;
    let cartItems = [];

    if (cart && cart.items.length > 0) {
      cartItems = cart.items.map((item) => {
        if (!item.productId) {
          console.warn(`Invalid productId for cart item: ${item._id}`);
          return null;
        }
        const total = item.quantity * item.productId.salePrice;
        totalPrice += total;
        return {
          _id: item.productId._id,
          productName: item.productId.productName,
          price: item.productId.salePrice,
          quantity: item.quantity,
          image: item.productId.productImages[0],
          total,
          stock: item.productId.quantity
        };
      }).filter(item => item !== null);
    }

    const cartCount = calculateCartCount(cart);

    // Revalidate applied coupon
    let discount = 0;
    let appliedCoupon = req.session.appliedCoupon || null;
    if (appliedCoupon) {
      const coupon = await Coupon.findOne({ name: appliedCoupon.name, isDeleted: false });
      if (coupon && coupon.createOn <= new Date() && coupon.expireOn >= new Date() && totalPrice >= coupon.minimumPrice) {
        discount = coupon.offerPrice;
        totalPrice -= discount;
      } else {
        req.session.appliedCoupon = null;
        appliedCoupon = null;
      }
    }

    res.json({
      success: true,
      message: "Quantity updated successfully",
      totalPrice,
      cartCount,
      cartItems,
      availableStock: product.quantity,
      discount,
      appliedCoupon
    });
  } catch (error) {
    console.error("Update quantity error:", error);
    res.status(500).json({ success: false, message: "Failed to update quantity" });
  }
};

// Get product stock information
const getProductStock = async (req, res) => {
  try {
    const productId = req.params.productId;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.json({
      success: true,
      stock: product.quantity,
      productName: product.productName
    });
  } catch (error) {
    console.error("Get product stock error:", error);
    res.status(500).json({ success: false, message: "Failed to get product stock" });
  }
};

// Get cart count
const getCartCount = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return res.json({ success: true, cartCount: 0 });
    }

    const cart = await Cart.findOne({ userId });
    const cartCount = calculateCartCount(cart);

    res.json({ success: true, cartCount });
  } catch (error) {
    console.error("Get cart count error:", error);
    res.status(500).json({ success: false, message: "Failed to get cart count" });
  }
};

// Update current time
const updateTime = async (req, res) => {
  try {
    const currentTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    res.json({ success: true, message: "Current time updated successfully", currentTime });
  } catch (error) {
    console.error("Update time error:", error);
    res.status(500).json({ success: false, message: "Failed to update time" });
  }
};

// Apply coupon
// const applyCoupon = async (req, res) => {
//   try {
//     const { couponCode } = req.body;
//     const userId = req.session.user;
//     if (!couponCode) {
//       return res.status(400).json({ success: false, message: "Coupon code is required" });
//     }

//     const coupon = await Coupon.findOne({ name: couponCode, isDeleted: false });
//     if (!coupon) {
//       return res.status(400).json({ success: false, message: "Invalid coupon code" });
//     }

//     const today = new Date();
//     if (coupon.createOn > today || coupon.expireOn < today) {
//       return res.status(400).json({ success: false, message: "Coupon is expired or not yet valid" });
//     }

//     const cart = await Cart.findOne({ userId }).populate("items.productId");
//     if (!cart || cart.items.length === 0) {
//       return res.status(400).json({ success: false, message: "Cart is empty" });
//     }

//     const totalPrice = cart.items.reduce((sum, item) => sum + item.productId.salePrice * item.quantity, 0);
//     if (totalPrice < coupon.minimumPrice) {
//       return res.status(400).json({
//         success: false,
//         message: `Cart total must be at least ₹${coupon.minimumPrice.toFixed(2)} to apply this coupon`,
//         totalPrice,
//       });
//     }

//     req.session.appliedCoupon = { name: coupon.name, offerPrice: coupon.offerPrice };
//     const discount = coupon.offerPrice;
//     const finalPrice = totalPrice - discount;

//     res.json({
//       success: true,
//       discount,
//       totalPrice: finalPrice,
//       message: `Coupon "${coupon.name}" applied successfully`,
//     });
//   } catch (err) {
//     console.error("Error applying coupon:", err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };

const applyCoupon = async (req, res) => {
  try {
    const { couponCode } = req.body;
    const userId = req.session.user;
    if (!couponCode) {
      return res.status(400).json({ success: false, message: "Coupon code is required" });
    }

    const coupon = await Coupon.findOne({ name: couponCode, isDeleted: false });
    if (!coupon) {
      return res.status(400).json({ success: false, message: "Invalid coupon code" });
    }

    const today = new Date();
    if (coupon.createOn > today || coupon.expireOn < today) {
      return res.status(400).json({ success: false, message: "Coupon is expired or not yet valid" });
    }

    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    const totalPrice = cart.items.reduce((sum, item) => sum + item.productId.salePrice * item.quantity, 0);
    if (totalPrice < coupon.minimumPrice) {
      return res.status(400).json({
        success: false,
        message: `Cart total must be at least ₹${coupon.minimumPrice.toFixed(2)} to apply this coupon`,
        totalPrice,
      });
    }

    req.session.appliedCoupon = { name: coupon.name, offerPrice: coupon.offerPrice };
    const discount = coupon.offerPrice;
    const finalPrice = totalPrice - discount;

    // Update cart document with discount
    await Cart.findOneAndUpdate(
      { userId },
      { discount: coupon.offerPrice },
      { new: true }
    );

    res.json({
      success: true,
      discount,
      totalPrice: finalPrice,
      message: `Coupon "${coupon.name}" applied successfully`,
    });
  } catch (err) {
    console.error("Error applying coupon:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get applied coupon
const getAppliedCoupon = async (req, res) => {
  try {
    const userId = req.session.user;
    let appliedCoupon = req.session.appliedCoupon || null;

    const cart = await Cart.findOne({ userId }).populate("items.productId");
    let totalPrice = cart ? cart.items.reduce((sum, item) => sum + item.productId.salePrice * item.quantity, 0) : 0;

    if (!appliedCoupon) {
      return res.json({ success: false, totalPrice });
    }

    const coupon = await Coupon.findOne({ name: appliedCoupon.name, isDeleted: false });
    if (!coupon || coupon.createOn > new Date() || coupon.expireOn < new Date() || totalPrice < coupon.minimumPrice) {
      req.session.appliedCoupon = null;
      appliedCoupon = null;
      return res.json({ success: false, totalPrice });
    }

    const discount = coupon.offerPrice;
    totalPrice -= discount;

    res.json({
      success: true,
      coupon: { name: coupon.name, offerPrice: coupon.offerPrice },
      discount,
      totalPrice,
    });
  } catch (err) {
    console.error("Error getting applied coupon:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update cart (recalculate totals and revalidate coupon)
const updateCart = async (req, res) => {
  try {
    const userId = req.session.user;
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart) {
      return res.json({ success: true, totalPrice: 0, discount: 0 });
    }

    let totalPrice = cart.items.reduce((sum, item) => sum + item.productId.salePrice * item.quantity, 0);
    let appliedCoupon = req.session.appliedCoupon || null;
    let discount = 0;

    if (appliedCoupon) {
      const coupon = await Coupon.findOne({ name: appliedCoupon.name, isDeleted: false });
      if (!coupon || coupon.createOn > new Date() || coupon.expireOn < new Date() || totalPrice < coupon.minimumPrice) {
        req.session.appliedCoupon = null;
        appliedCoupon = null;
      } else {
        discount = coupon.offerPrice;
        totalPrice -= discount;
      }
    }

    res.json({ success: true, totalPrice, discount, appliedCoupon });
  } catch (err) {
    console.error("Error updating cart:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  loadCartPage,
  addToCart,
  removeFromCart,
  updateQuantity,
  getProductStock,
  getCartCount,
  updateTime,
  applyCoupon,
  getAppliedCoupon,
  updateCart
};