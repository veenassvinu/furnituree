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

    console.log("products ", products);

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
    console.error("Error saving product:", error);
    return res.status(500).send("An error occurred while saving the product.");
  }
};

const loadEditProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    // Fetch the product by ID
    const product = await Product.findById(productId);
    console.log("products data:", product);

    // Fetch all available categories
    const categories = await Category.find();

    if (!product) {
      return res.status(404).send("Product not found");
    }

    // Pass both product and categories to the template
    res.render("edit-product", { product, cat: categories });
  } catch (error) {
    console.error("Error loading edit product page:", error);
    res.status(500).send("An error occurred while loading the page.");
  }
};

const editproduct = async (req, res) => {
  try {
    const productId = req.params.id; // Product ID from the request params
    const updatedData = req.body; // Updated product data from the request body

    // Debugging: log incoming data
    console.log("Updated Product Data:", updatedData);

    // Check if the product exists
    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      return res.status(404).send("Product not found");
    }

    // Check if files were uploaded for new images
    const images = existingProduct.productImages; // Start with the current images
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
    const category = await Category.findOne({ name: updatedData.category });
    if (!category) {
      return res.status(400).send("Invalid category name");
    }

    // Update product details
    existingProduct.productName =
      updatedData.productName || existingProduct.productName;
    existingProduct.description =
      updatedData.description || existingProduct.description;
    existingProduct.category = category._id || existingProduct.category;
    existingProduct.originalPrice =
      updatedData.regularPrice || existingProduct.originalPrice;
    existingProduct.salePrice =
      updatedData.salePrice || existingProduct.salePrice;
    existingProduct.quantity = updatedData.quantity || existingProduct.quantity;
    existingProduct.color = updatedData.color || existingProduct.color;
    existingProduct.productImages =
      images.length > 0 ? images : existingProduct.productImages;
    existingProduct.status = updatedData.status || existingProduct.status;

    // Save the updated product to the database
    const updatedProduct = await existingProduct.save();

    console.log("Updated Product:", updatedProduct); // Debugging: log updated product

    return res.redirect("/admin/product"); // Redirect to the products page after editing
  } catch (error) {
    console.error("Error editing product:", error);
    return res.status(500).send("An error occurred while editing the product.");
  }
};


const deleteImage = async (req, res) => {
  try {
    const { productId, imageIndex } = req.body;

    // Validate input
    if (!productId || imageIndex === undefined) {
      return res.status(400).json({ error: "Invalid request data" });
    }

    // Find the product by ID
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Check if the image index is valid
    if (!product.productImages || !product.productImages[imageIndex]) {
      return res.status(400).json({ error: "Invalid image index" });
    }

    // Get the image filename to delete
    const imageToDelete = product.productImages[imageIndex];

    // Remove the image from the productImages array
    product.productImages.splice(imageIndex, 1);

    // Save the updated product
    await product.save();

    // Delete the image file from the server
    const imagePath = path.join(
      __dirname,
      "public",
      "uploads",
      "product-images",
      imageToDelete
    );
    fs.unlink(imagePath, (err) => {
      if (err) {
        console.error("Error deleting image file:", err);
      }
    });

    // Send a success response
    res.status(200).json({ message: "Image deleted successfully" });
  } catch (error) {
    console.error("Error deleting image:", error);
    res
      .status(500)
      .json({ error: "An error occurred while deleting the image" });
  }
};

const blockProduct=async(req,res)=>{
  try {
    let id=req.query.id;
    await Product.updateOne({_id:id},{$set:{isBlocked:true}});
    res.redirect("/admin/product");
  } catch (error) {
    res.redirect("/pageerror");
  }
}

const unblockProduct=async(req,res)=>{
  try {
    let id=req.query.id;
    await Product.updateOne({_id:id},{$set:{isBlocked:false}});
    res.redirect("/admin/product");
  } catch (error) {
    res.redirect("/pageerror");
  }
}


module.exports = {
  getProductAddPage,
  loadProduct,
  addproduct,
  editproduct,
  loadEditProduct,
  deleteImage,
  blockProduct,
  unblockProduct,
};
