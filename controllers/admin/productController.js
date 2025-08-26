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
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const search = req.query.search || "";
    const skip = (page - 1) * limit;

    const searchFilter = search
      ? {
          $or: [
            { productName: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const totalProducts = await Product.countDocuments(searchFilter);
    const totalPages = Math.max(Math.ceil(totalProducts / limit), 1);
    const currentPage = Math.min(page, totalPages);

  
    const products = await Product.find(searchFilter)
      .populate("category")
      .sort({ createdAt: -1 }) 
      .skip((currentPage - 1) * limit)
      .limit(limit);

    res.render("Products-Management", {
      products,
      totalPages,
      currentPage,
      search,
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
    if (req.body.images) {
      if (typeof req.body.images === "string") {
        products.images = [req.body.images];
      } else if (Array.isArray(req.body.images)) {
        products.images = req.body.images;
      }
    }
    const images = [];

    const outputDir = path.join(process.cwd(), "public/uploads/product-images");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    if (
      !products.images ||
      !Array.isArray(products.images) ||
      products.images.length !== 4
    ) {
      return res.status(400).send("Exactly 4 product images are required.");
    }

    for (let i = 0; i < products.images.length; i++) {
      const base64Image = products.images[i];
      const matches = base64Image.match(
        /^data:image\/(jpeg|jpg|png);base64,(.+)$/
      );

      if (!matches || matches.length !== 3) {
        return res.status(400).send("Invalid image format.");
      }

      const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
      const buffer = Buffer.from(matches[2], "base64");

      const filename = `${Date.now()}_${i}.${ext}`;
      const outputPath = path.join(outputDir, filename);

      await sharp(buffer).resize(440, 440).toFile(outputPath);
      images.push(filename);
    }

    // Check for duplicate product name
    const productExists = await Product.findOne({
      productName: products.productName,
    });

    if (productExists) {
      return res
        .status(400)
        .send("Product already exists. Please use another name.");
    }

    // Check category validity
    const category = await Category.findOne({ name: products.category });
    if (!category) {
      return res.status(400).send("Invalid category name.");
    }

    const newProduct = new Product({
      productName: products.productName,
      description: products.description,
      category: category._id,
      originalPrice: products.regularPrice,
      salePrice: products.salePrice,
      quantity: products.quantity,
      productImages: images,
      status: "Available",
      isBlocked: false,
      createOn: new Date(),
    });

    await newProduct.save();

    console.log("✅ New Product Saved:", newProduct);
    res.status(200).json("Product added successfully");
  } catch (error) {
    console.error("❌ Error saving product:", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).send(messages.join(", "));
    }

    res.status(500).send("An error occurred while saving the product.");
  }
};

const loadEditProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    const product = await Product.findById(productId);
    console.log("products data:", product);

    const categories = await Category.find();

    if (!product) {
      return res.status(404).send("Product not found");
    }

    res.render("edit-product", { product, cat: categories });
  } catch (error) {
    console.error("Error loading edit product page:", error);
    res.status(500).send("An error occurred while loading the page.");
  }
};

const editproduct = async (req, res) => {
  try {
    const {
      productName,
      category,
      description,
      regularPrice,
      salePrice,
      quantity,
    } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).send("Product not found");

    product.productName = productName;
    product.category = new mongoose.Types.ObjectId(category);
    product.description = description;
    product.originalPrice = regularPrice;
    product.salePrice = salePrice;
    product.quantity = quantity;

    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file) => file.filename);
      product.productImages.push(...newImages);
    }

    await product.save();

    res.redirect(`/admin/edit-product/${req.params.id}?updated=success`);
  } catch (err) {
    console.error("Edit Product Error:", err);

    res.redirect(`/admin/edit-product/${req.params.id}?updated=error`);
  }
};

const deleteImage = async (req, res) => {
  try {
    const { productId, imageIndex } = req.body;

    // Validate input
    if (!productId || imageIndex === undefined) {
      return res.status(400).json({ error: "Invalid request data" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (!product.productImages || !product.productImages[imageIndex]) {
      return res.status(400).json({ error: "Invalid image index" });
    }

    const imageToDelete = product.productImages[imageIndex];

    product.productImages.splice(imageIndex, 1);

    await product.save();

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

    res.status(200).json({ message: "Image deleted successfully" });
  } catch (error) {
    console.error("Error deleting image:", error);
    res
      .status(500)
      .json({ error: "An error occurred while deleting the image" });
  }
};

const blockProduct = async (req, res) => {
  try {
    let id = req.query.id;
    await Product.updateOne({ _id: id }, { $set: { isBlocked: true } });
    res.redirect("/admin/product");
  } catch (error) {
    res.redirect("/pageerror");
  }
};

const unblockProduct = async (req, res) => {
  try {
    let id = req.query.id;
    await Product.updateOne({ _id: id }, { $set: { isBlocked: false } });
    res.redirect("/admin/product");
  } catch (error) {
    res.redirect("/pageerror");
  }
};

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
