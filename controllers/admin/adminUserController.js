 const User=require("../../models/userSchema");

 const userInfo = async (req, res) => {
    try {
        // Initialize search and page parameters
        const search = req.query.search || ""; // Default to empty string if no search query
        const page = parseInt(req.query.page, 10) || 1; // Ensure `page` is an integer
        const limit = 5; // Items per page

        if (page < 1) {
            // If the page number is less than 1, default it to 1
            return res.redirect("/admin/User?search=" + search + "&page=1");
        }

        // Calculate the number of documents to skip
        const skip = (page - 1) * limit;

        // Fetch user data with search criteria and pagination
        const userData = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } }, // Case-insensitive search
                { email: { $regex: ".*" + search + ".*", $options: "i" } }
            ]
        })
            .limit(limit)
            .skip(skip)
            .exec();

        // Count the total number of documents matching the criteria
        const count = await User.countDocuments({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } },
                { email: { $regex: ".*" + search + ".*", $options: "i" } }
            ]
        });

        // Calculate the total number of pages
        const totalPages = Math.ceil(count / limit);

        // Handle cases where the `page` exceeds totalPages
        if (totalPages > 0 && page > totalPages) {
            return res.redirect(`/admin/User?search=${search}&page=${totalPages}`);
        }

        // Return the data along with pagination info
        res.render("User-Management", {
            userData,
            currentPage: page,
            totalPages,
            search,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
};

const UserBlocked = async (req, res) => {
    try {
        const id = req.query.id;
        await User.updateOne({ _id: id }, { $set: { isBlocked: true } });
        res.redirect("/admin/User");
    } catch (error) {
        res.redirect("/admin/pageerror");
    }
};

const UserunBlocked = async (req, res) => {
    try {
        const id = req.query.id;
        await User.updateOne({ _id: id }, { $set: { isBlocked: false } });
        res.redirect("/admin/User");
    } catch (error) {
        res.redirect("/admin/pageerror");
    }
};

module.exports = {
    userInfo,
    UserBlocked,
    UserunBlocked,
};
