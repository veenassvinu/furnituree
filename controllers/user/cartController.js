const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
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

    if (!userId) {
      return res.status(401).render("cart", { cartItems: [], totalPrice: 0, cartCount: 0, error: "Please log in to view your cart" });
    }

    const cart = await Cart.findOne({ userId }).populate("items.productId");

    let cartItems = [];
    let totalPrice = 0;

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

    res.render("cart", { cartItems, totalPrice, cartCount });
  } catch (error) {
    console.error("Error loading cart:", error);
    res.status(500).render("cart", { cartItems: [], totalPrice: 0, cartCount: 0, error: "Error loading cart" });
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

    res.json({
      success: true,
      message: "Item added to cart successfully",
      cartCount,
      cartItems,
      totalPrice: cartTotalPrice
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

    res.json({
      success: true,
      message: "Item removed from cart successfully",
      totalPrice,
      cartCount,
      cartItems
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

    res.json({
      success: true,
      message: "Quantity updated successfully",
      totalPrice,
      cartCount,
      cartItems,
      availableStock: product.quantity
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

module.exports = {
  loadCartPage,
  addToCart,
  removeFromCart,
  updateQuantity,
  getProductStock,
  getCartCount,
  updateTime
};