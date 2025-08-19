// const User = require("../../models/userSchema")
const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema"); // ✅ Import Product
const User = require("../../models/userSchema");
const mongoose = require("mongoose");

// GET cart page


// const loadCartPage = async (req, res) => {
//   try {
//     const userId = req.session.user;
//     console.log("User ID in session:", userId);

//     if (!userId) {
//       return res.status(401).render("cart", { cartItems: [], totalPrice: 0, error: "Please log in to view your cart" });
//     }

//     // Fetch the cart from the Cart model
//     const cart = await Cart.findOne({ userId }).populate("items.productId");
    
//     let cartItems = [];
//     let totalPrice = 0;

//     if (cart && cart.items.length > 0) {
//       cartItems = cart.items.map((item) => {
//         if (!item.productId) {
//           console.warn(`Invalid productId for cart item: ${item._id}`);
//           return null; // Skip invalid items
//         }
//         const total = item.quantity * item.productId.salePrice;
//         totalPrice += total;
//         return {
//           _id: item.productId._id, // Product ID for remove/update
//           productName: item.productId.productName,
//           price: item.productId.salePrice,
//           quantity: item.quantity,
//           image: item.productId.productImages[0],
//           total,
//         };
//       }).filter(item => item !== null); // Remove invalid items
//     }

//     console.log("Cart items:", cartItems);
//     console.log("Total price:", totalPrice);

//     res.render("cart", { cartItems, totalPrice });
//   } catch (error) {
//     console.error("Error loading cart:", error);
//     res.status(500).render("cart", { cartItems: [], totalPrice: 0, error: "Error loading cart" });
//   }
// };

// // Add to cart
// const addToCart = async (req, res) => {
//   try {
//     const userId = req.session.user;
//     if (!userId) {
//       return res.status(401).json({ message: "Please log in first" });
//     }

//     const productId = req.params.productId;
//     const quantity = parseInt(req.body.quantity) || 1; // Default to 1 if not provided

//     if (isNaN(quantity) || quantity < 1) {
//       return res.status(400).json({ message: "Quantity must be a positive number" });
//     }

//     const product = await Product.findById(productId);
//     if (!product) {
//       return res.status(404).json({ message: "Product not found" });
//     }

//     const price = product.salePrice;
//     if (typeof price !== "number" || isNaN(price) || price < 0) {
//       return res.status(400).json({ message: "Invalid product price" });
//     }

//     const totalPrice = price * quantity;
//     if (isNaN(totalPrice)) {
//       return res.status(400).json({ message: "Failed to calculate total price" });
//     }

//     let cart = await Cart.findOne({ userId });
//     if (!cart) {
//       cart = new Cart({
//         userId,
//         items: [{ productId, quantity, price, totalPrice }],
//       });
//     } else {
//       const itemIndex = cart.items.findIndex(
//         (item) => item.productId.toString() === productId
//       );

//       if (itemIndex > -1) {
//         cart.items[itemIndex].quantity += quantity;
//         cart.items[itemIndex].totalPrice = cart.items[itemIndex].quantity * price;
//       } else {
//         cart.items.push({ productId, quantity, price, totalPrice });
//       }
//     }

//     await cart.save();
//     res.json({ message: "Item added to cart successfully" });
//   } catch (error) {
//     console.error("Add to cart error:", error);
//     res.status(500).json({ message: "Something went wrong", error: error.message });
//   }
// };

// // Remove from cart
// // const removeFromCart = async (req, res) => {
// //   try {
// //     const userId = req.session.user;
// //     const productId = req.params.id;

// //     if (!userId || !productId) {
// //       return res.status(400).json({ success: false, message: "Invalid user or product ID" });
// //     }

// //     const result = await Cart.findOneAndUpdate(
// //       { userId },
// //       { $pull: { items: { productId } } },
// //       { new: true }
// //     );

// //     if (!result) {
// //       return res.status(404).json({ success: false, message: "Cart or item not found" });
// //     }

// //     res.json({ success: true });
// //   } catch (error) {
// //     console.error("Remove from cart error:", error);
// //     res.status(500).json({ success: false, message: "Failed to remove item from cart" });
// //   }
// // };

// const removeFromCart = async (req, res) => {
//   try {
//     const userId = req.session.user;
//     const productId = req.params.id;

//     // Validate userId and productId
//     if (!userId || !mongoose.Types.ObjectId.isValid(productId)) {
//       return res.status(400).json({ success: false, message: "Invalid user or product ID" });
//     }

//     // Find the cart and check if the item exists
//     const cart = await Cart.findOne({ userId });
//     if (!cart) {
//       return res.status(404).json({ success: false, message: "Cart not found" });
//     }

//     const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
//     if (itemIndex === -1) {
//       return res.status(404).json({ success: false, message: "Item not found in cart" });
//     }

//     // Perform the update
//     const result = await Cart.findOneAndUpdate(
//       { userId },
//       { $pull: { items: { productId } } },
//       { new: true }
//     );

//     if (!result) {
//       return res.status(500).json({ success: false, message: "Failed to update cart" });
//     }

//     res.json({ success: true, message: "Item removed from cart successfully" });
//   } catch (error) {
//     console.error("Remove from cart error:", error);
//     res.status(500).json({ success: false, message: "Failed to remove item from cart" });
//   }
// };

// // Update quantity
// const updateQuantity = async (req, res) => {
//   try {
//     const { productId, quantity } = req.body;
//     const userId = req.session.user;

//     if (!userId || !productId || !quantity) {
//       return res.status(400).json({ success: false, message: "Invalid input" });
//     }

//     const qty = parseInt(quantity);
//     if (isNaN(qty) || qty < 1) {
//       return res.status(400).json({ success: false, message: "Quantity must be a positive number" });
//     }

//     const cart = await Cart.findOne({ userId }).populate("items.productId");
//     if (!cart) {
//       return res.status(404).json({ success: false, message: "Cart not found" });
//     }

//     const item = cart.items.find(item => item.productId._id.toString() === productId);
//     if (!item) {
//       return res.status(404).json({ success: false, message: "Item not found in cart" });
//     }

//     item.quantity = qty;
//     item.totalPrice = qty * item.productId.salePrice;
//     await cart.save();

//     let totalPrice = 0;
//     cart.items.forEach(item => {
//       totalPrice += item.quantity * item.productId.salePrice;
//     });

//     res.json({ success: true, totalPrice });
//   } catch (error) {
//     console.error("Update quantity error:", error);
//     res.status(500).json({ success: false, message: "Failed to update quantity" });
//   }
// };

// module.exports = {
//   loadCartPage,
//   addToCart,
//   removeFromCart,
//   updateQuantity,
// };








// GET cart page
const loadCartPage = async (req, res) => {
  try {
    const userId = req.session.user;
    console.log("User ID in session:", userId);

    if (!userId) {
      return res.status(401).render("cart", { cartItems: [], totalPrice: 0, error: "Please log in to view your cart" });
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
        };
      }).filter(item => item !== null);
    }

    console.log("Cart items:", cartItems);
    console.log("Total price:", totalPrice);

    res.render("cart", { cartItems, totalPrice });
  } catch (error) {
    console.error("Error loading cart:", error);
    res.status(500).render("cart", { cartItems: [], totalPrice: 0, error: "Error loading cart" });
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

    const price = product.salePrice;
    if (typeof price !== "number" || isNaN(price) || price < 0) {
      return res.status(400).json({ success: false, message: "Invalid product price" });
    }

    const totalPrice = price * quantity;
    if (isNaN(totalPrice)) {
      return res.status(400).json({ success: false, message: "Failed to calculate total price" });
    }

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
        cart.items[itemIndex].quantity += quantity;
        cart.items[itemIndex].totalPrice = cart.items[itemIndex].quantity * price;
      } else {
        cart.items.push({ productId, quantity, price, totalPrice });
      }
    }

    await cart.save();
    res.json({ success: true, message: "Item added to cart successfully" });
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

    const result = await Cart.findOneAndUpdate(
      { userId },
      { $pull: { items: { productId } } },
      { new: true }
    );

    if (!result) {
      return res.status(500).json({ success: false, message: "Failed to update cart" });
    }

    res.json({ success: true, message: "Item removed from cart successfully" });
  } catch (error) {
    console.error("Remove from cart error:", error);
    res.status(500).json({ success: false, message: "Failed to remove item from cart" });
  }
};

// Update quantity
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
    cart.items.forEach(item => {
      totalPrice += item.quantity * item.productId.salePrice;
    });

    res.json({ success: true, message: "Quantity updated successfully", totalPrice });
  } catch (error) {
    console.error("Update quantity error:", error);
    res.status(500).json({ success: false, message: "Failed to update quantity" });
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
  updateTime,
};