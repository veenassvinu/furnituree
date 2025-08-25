 const User=require("../../models/userSchema");

 const userInfo = async (req, res) => {
    try {
        const search = req.query.search || ""; 
        const page = parseInt(req.query.page, 10) || 1; 
        const limit = 5; 

        if (page < 1) {
            return res.redirect("/admin/User?search=" + search + "&page=1");
        }

        const skip = (page - 1) * limit;

        const userData = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } }, 
                { email: { $regex: ".*" + search + ".*", $options: "i" } }
            ]
        })
            .sort({ _id: -1 })
            .limit(limit)
            .skip(skip)
            .exec();

        const count = await User.countDocuments({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } },
                { email: { $regex: ".*" + search + ".*", $options: "i" } }
            ]
        });

        const totalPages = Math.ceil(count / limit);

        if (totalPages > 0 && page > totalPages) {
            return res.redirect(`/admin/User?search=${search}&page=${totalPages}`);
        }

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
