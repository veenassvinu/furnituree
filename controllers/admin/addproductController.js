const fs = require("fs");
const path = require("path");

const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");

const loadaddproduct = (req, res) => {
  res.render("addproduct");
};

// Controller function to handle the addition of a new product
// const addproduct = (req, res) => {
//   const {
//     category,
//     color,
//     quantity,
//     salePrice,
//     regularPrice,
//     description,
//     productName,
//     image1,
//     image2,
//     image3,
//     image4,

//   } = req.body;
//   console.log(image4);

//   const newproduct = new Product({
//     category,
//     color,
//     quantity,
//     salePrice,
//     regularPrice,
//     description,
//     productName,
//     image1,
//     image2,
//     image3,
//     image4,
//   });

//   newproduct.save();

//   res.redirect("/admin/product");
// };

const addproduct = async (req, res) => {
  try {
    console.log("Body ", products);
    console.log("Files ", req.files);

    const products = req.body;
    const croppedImages = [];

    // Define the upload directory path relative to project root
    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "product-images"
    );

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Handle multiple cropped images
    if (Array.isArray(products["croppedImages[]"])) {
      // Multiple images
      for (let i = 0; i < products["croppedImages[]"].length; i++) {
        const base64Data = products["croppedImages[]"][i].replace(
          /^data:image\/jpeg;base64,/,
          ""
        );
        const filename = `product-${Date.now()}-${i}.jpeg`;
        const filePath = path.join(uploadDir, filename);

        // Save the cropped image to the filesystem
        fs.writeFileSync(filePath, base64Data, "base64");
        croppedImages.push(filename);
      }
    } else if (products["croppedImages[]"]) {
      // Single image
      const base64Data = products["croppedImages[]"].replace(
        /^data:image\/jpeg;base64,/,
        ""
      );
      const filename = `product-${Date.now()}.jpeg`;
      const filePath = path.join(uploadDir, filename);

      // Save the cropped image to the filesystem
      fs.writeFileSync(filePath, base64Data, "base64");
      croppedImages.push(filename);
    }

    // Create and save the new product
    const newProduct = new Product({
      productName: products.productName,
      description: products.description,
      category: products.category,
      regularPrice: products.regularPrice,
      salePrice: products.salePrice,
      createOn: new Date(),
      quantity: products.quantity,
      color: products.color,
      productImage: croppedImages,
      status: "Available",
    });

    await newProduct.save();
    return res.redirect("/admin/addproduct");
  } catch (error) {
    console.log("Error saving product:", error);
    return res.redirect("/admin/pageerror");
  }
};

module.exports = {
  addproduct,
  loadaddproduct,
};
