const mongoose = require("mongoose");
const { Schema } = mongoose;
const { v4: uuidv4 } = require("uuid");

const orderSchema = new Schema({
  orderId: {
    type: String,
    default: () => "ORD" + uuidv4().split("-")[0],
    unique: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  name: { type: String, trim: true },
  items: [
    {
      productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true }
    }
  ],
  totalPrice: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  address: { type: Object, required: true },
  paymentMethod: {
    type: String,
    enum: ["COD", "Razorpay", "Wallet"],
    required: true
  },
  paymentInfo: {
    orderId: String,
    paymentId: String,
    signature: String
  },
  status: {
    type: String,
    enum: [
      "Pending",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
      "Return Request",
      "Returned"
    ],
    default: "Pending"
  },
  couponApplied: { type: Boolean, default: false }
}, { timestamps: true });

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
