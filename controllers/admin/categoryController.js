const Category=require("../../models/categorySchema");



const categoryInfo = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const search = req.query.search || "";

    const searchFilter = search
      ? { name: { $regex: search, $options: "i" } }
      : {};

    const totalCategories = await Category.countDocuments(searchFilter);
    const totalPages = Math.ceil(totalCategories / limit);

    const categoryData = await Category.find(searchFilter)
      .skip(skip)
      .limit(limit);

    res.render("category-Management", {
      cat: categoryData,
      currentPage: page,
      totalPages,
      totalCategories,
      search, 
    });
  } catch (error) {
    console.error("Error loading categories:", error);
    res.redirect("/pageerror");
  }
};

const addCategory = async (req, res) => {
    const { name, description } = req.body;

    // Validate input
    if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({
            success: false,
            message: "Category name is required and must be a non-empty string."
        });
    }

    if (!description || typeof description !== 'string' || description.trim() === '') {
        return res.status(400).json({
            success: false,
            message: "Description is required and must be a non-empty string."
        });
    }

    try {
        // Check if category with same name exists (case-insensitive)
        const regex = new RegExp(`^${name.trim()}$`, 'i');
        const existingCategory = await Category.findOne({ name: regex });

        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: "Category already exists."
            });
        }

        // Save new category
        const newCategory = new Category({
            name: name.trim(),
            description: description.trim()
        });

        await newCategory.save();

        return res.status(200).json({
            success: true,
            message: "Category added successfully."
        });
    } catch (error) {
        console.error("Error in addCategory:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error. Please try again later."
        });
    }
};

const updateCategory = async (req, res) => {
    try {
        const { id } = req.params; 
        const { name, description } = req.body; 

        // Check if category exists
        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }

        // Update category details
        category.name = name || category.name;
        category.description = description || category.description;
        await category.save();

        res.json({ success: true, message: "Category updated successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params; 

        // Find and delete the category
        const category = await Category.findByIdAndDelete(id);
        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }

        res.json({ success: true, message: "Category deleted successfully" });
    } catch (error) {
        console.error("error deleting category",error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const listCategory = async (req, res) => {
    try {
        const { id } = req.params;

        const category = await Category.findByIdAndUpdate(
            id,
            { isListed: true },
            { new: true } 
        );

        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }

        res.json({ success: true, message: "Category listed successfully" });
    } catch (error) {
        console.error("Error listing category:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const unlistCategory = async (req, res) => {
    try {
        const { id } = req.params;

        const category = await Category.findByIdAndUpdate(
            id,
            { isListed: false },
            { new: true } 
        );

        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }

        res.json({ success: true, message: "Category unlisted successfully" });
    } catch (error) {
        console.error("Error unlisting category:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};


module.exports= {
    categoryInfo,
    addCategory,
    updateCategory,
    deleteCategory,
    listCategory,
    unlistCategory,
}