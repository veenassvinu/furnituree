const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  offerPrice: { type: Number, required: true },
  minimumPrice: { type: Number, required: true },
  createOn: { type: Date, required: true },
  expireOn: { type: Date, required: true },
  isDeleted: { type: Boolean, default: false }
});

module.exports = mongoose.model("Coupon", couponSchema);