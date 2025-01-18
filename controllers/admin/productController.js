const Product = require("../../models/productSchema");
const category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const Category = require("../../models/categorySchema");
const { default: mongoose } = require("mongoose");

const loadProduct = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Current page
    const limit = 10; // Items per page
    const skip = (page - 1) * limit;

    const totalProducts = await Product.countDocuments();
    const totalPages = Math.ceil(totalProducts / limit);

    const products = await Product.find({})
      .populate("category") // Populate category field
      .skip(skip)
      .limit(limit);

    res.render("Products-Management", {
      products,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error("Error loading products:", error);
    res.status(500).send("An error occurred while fetching products");
  }
};

const getProductAddPage = async (req, res) => {
  try {
    const categories = await Category.find({ isListed: true });
    res.render("add-product", { cat: categories });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.redirect("/pageerror");
  }
};

const addproduct = async (req, res) => {
  try {
    const products = req.body;

    // Debugging: log incoming data and uploaded files
    console.log("Submitted Product Data:", products);
    // console.log("Uploaded Files:", req.files);

    const productExists = await Product.findOne({
      productName: products.productName,
    });

    if (!productExists) {
      const images = [];

      // Check if files were uploaded
      if (req.files && req.files.length > 0) {
        for (let i = 0; i < req.files.length; i++) {
          const originalImagePath = req.files[i].path;


          const resizeImagePath = path.join(
            "public",
            "uploads",
            "product-images",
            req.files[i].filename
          );
          await sharp(originalImagePath)
            .resize({ width: 440, height: 440 })
            .toFile(resizeImagePath);

          // Push resized image filename to the images array
          images.push(req.files[i].filename);
        }
      }

      // Query the Category model by name to find the corresponding _id
      const category = await Category.findOne({ name: products.category });

      if (!category) {
        return res.status(400).send("Invalid category name");
      }

      // Create the new product with the images array
      const newProduct = new Product({
        productName: products.productName,
        description: products.description,
        category: category._id, // Use the _id from the Category document
        originalPrice: products.regularPrice,
        salePrice: products.salePrice,
        createOn: new Date(),
        quantity: products.quantity,
        color: products.color,
        productImages: images, // Save the image filenames to the database
        status: "Available",
      });

      await newProduct.save();

      console.log("New Product Saved:", newProduct); // Debugging: log saved product

      return res.redirect("/admin/addproduct");
    } else {
      return res
        .status(400)
        .json("Product already exists. Please try another name.");
    }
  } catch (error) {
    console.log("Error saving product:", error);
    return res.status(500).send("An error occurred while saving the product.");
  }
};


module.exports = {
  getProductAddPage,
  loadProduct,
  addproduct,
};
