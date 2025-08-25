const Order = require("../../models/orderSchema");




const loadOrder = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;

    // Search parameter
    let searchQuery = req.query.search || '';

    // ✅ Strip # if user typed it
    if (searchQuery.startsWith("#")) {
      searchQuery = searchQuery.substring(1);
    }

    // Build query
    let query = {};
    let userIds = [];

    if (searchQuery) {
      // Import User model
      const User = require("../../models/userSchema");

      // ✅ First: find users whose name matches the search
      const matchedUsers = await User.find(
        { name: { $regex: searchQuery, $options: "i" } },
        "_id"
      ).lean();

      userIds = matchedUsers.map(u => u._id);

      // ✅ Query can match either orderId OR userId from matched users
      query = {
        $or: [
          { orderId: { $regex: searchQuery, $options: "i" } },
          { userId: { $in: userIds } }
        ]
      };
    }

    // Fetch total orders count and paginated orders
    const totalOrders = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "name") // ✅ populate user name
      .lean();

    // Map user name into order
    for (let order of orders) {
      order.name = order.userId?.name || "N/A";
    }

    const totalPages = Math.ceil(totalOrders / limit);

    res.render("order-management", {
      orders,
      currentPage: page,
      totalPages,
      totalOrders,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page + 1,
      prevPage: page - 1,
      searchQuery: req.query.search || ''
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).send("Server Error");
  }
};



const loadOrderDetails = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).lean();
    if (!order) {
      return res.status(404).send("Order not found");
    }
    console.log("Fetched order details:", order);
    res.render("order-details", { order });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).send("Server Error");
  }
};

const changeStatus = async (req, res)=>{
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const updatedOrder = await Order.findByIdAndUpdate(
      id, 
      { status }, 
      { new: true }
    );
    
    if (!updatedOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.json({ message: 'Order status updated successfully', order: updatedOrder });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update order status', error: error.message });
  }
}

module.exports = {
  loadOrder,
  loadOrderDetails,
  changeStatus
};
