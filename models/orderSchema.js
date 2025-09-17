const mongoose = require("mongoose");
const { Schema } = mongoose;
const { v4: uuidv4 } = require("uuid");

const orderItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },
  totalPrice: { type: Number, required: true },

  // Item level tracking
  status: {
    type: String,
    enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled", "Returned"],
    default: "Pending",
  },
  cancelReason: { type: String, default: null },
  returnReason: { type: String, default: null },
  refundStatus: {
    type: String,
    enum: ["Not Applicable", "Pending", "Refunded"],
    default: "Not Applicable",
  },
});

const orderSchema = new Schema(
  {
    orderId: {
      type: String,
      default: () => "ORD" + uuidv4().split("-")[0],
      unique: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    items: [orderItemSchema],

    totalPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    couponName: { type: String, default: null },
    couponApplied: { type: Boolean, default: false },

    // address as object
    address: {
      addressType: { type: String, required: true },
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String, required: true },
      landMark: { type: String },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      country: { type: String, required: true },
    },

    paymentMethod: { type: String, enum: ["COD", "Razorpay"], required: true },

    paymentInfo: {
      razorpayOrderId: { type: String },
      razorpayPaymentId: { type: String },
      razorpaySignature: { type: String },
    },

    // Order level status
    orderStatus: {
      type: String,
      enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled", "Returned"],
      default: "Pending",
    },

    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Refunded", "Failed"],
      default: "Pending",
    },

    cancelReason: { type: String, default: null },
    returnReason: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
