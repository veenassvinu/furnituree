const Coupon = require("../../models/couponSchema");

const loadCoupon = async (req, res) => {
  try {
    let search = req.query.search || "";
    let query = {}; // Remove the isDeleted filter to get ALL coupons

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    // Load all coupons (both active and deleted) so the frontend can separate them
    const coupons = await Coupon.find(query).sort({ createOn: -1 });
    res.render("coupon-management", { coupons, search });
  } catch (error) {
    console.error("Error loading coupons:", error);
    res.status(500).send("Server Error");
  }
};

const createCoupon = async (req, res) => {
  try {
    let { name, createOn, expireOn, offerPrice, minimumPrice } = req.body;

    name = String(name || "").trim();
    const start = new Date(createOn);
    const end = new Date(expireOn);
    const offer = Number(offerPrice);
    const min = Number(minimumPrice);

    if (!name) {
      return res.status(400).json({ success: false, message: "Coupon code is required" });
    }

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid dates" });
    }

    const today = new Date(); today.setHours(0,0,0,0);
    const s = new Date(start); s.setHours(0,0,0,0);
    const e = new Date(end);   e.setHours(0,0,0,0);

    if (s < today) {
      return res.status(400).json({ success: false, message: "Start date cannot be in the past" });
    }
    if (e <= s) {
      return res.status(400).json({ success: false, message: "Expire date must be later than start date" });
    }
    if (!Number.isFinite(offer) || !Number.isFinite(min) || offer <= 0 || min <= 0) {
      return res.status(400).json({ success: false, message: "Discount and minimum price must be positive numbers" });
    }

    // Check for existing active coupons only (allow reusing deleted coupon codes)
    const exists = await Coupon.findOne({ name, isDeleted: false });
    if (exists) {
      return res.status(409).json({ success: false, message: "Coupon code already exists" });
    }

    await Coupon.create({
      name,
      createOn: start,
      expireOn: end,
      offerPrice: offer,
      minimumPrice: min
    });

    return res.status(201).json({ success: true });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: "Coupon code already exists" });
    }
    console.error("Error creating coupon:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, createOn, expireOn, offerPrice, minimumPrice } = req.body;

    const start = new Date(createOn);
    const end = new Date(expireOn);
    const today = new Date();
    today.setHours(0,0,0,0);

    if (start < today) {
      return res.status(400).send("Start date cannot be in the past");
    }

    if (end <= start) {
      return res.status(400).send("Expire date must be later than start date");
    }

    await Coupon.findByIdAndUpdate(id, {
      name,
      createOn: start,
      expireOn: end,
      offerPrice,
      minimumPrice
    });

    res.redirect("/admin/coupon");
  } catch (error) {
    console.error("Error updating coupon:", error);
    res.status(500).send("Server Error");
  }
};

const deleteCoupon = async (req, res) => {
  try {
    await Coupon.findByIdAndUpdate(req.params.id, { isDeleted: true });
    res.status(200).json({ success: true, message: "Coupon moved to Previously Used Coupons successfully" });
  } catch (error) {
    console.error("Error soft deleting coupon:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

module.exports = {
  loadCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon
};