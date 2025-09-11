const Order = require("../../models/orderSchema");




const loadOrder = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;

    let searchQuery = req.query.search || '';

    if (searchQuery.startsWith("#")) {
      searchQuery = searchQuery.substring(1);
    }

    let query = {};
    let userIds = [];

    if (searchQuery) {
      const User = require("../../models/userSchema");

      const matchedUsers = await User.find(
        { name: { $regex: searchQuery, $options: "i" } },
        "_id"
      ).lean();

      userIds = matchedUsers.map(u => u._id);

      query = {
        $or: [
          { orderId: { $regex: searchQuery, $options: "i" } },
          { userId: { $in: userIds } }
        ]
      };
    }

    const totalOrders = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "name") 
      
      .lean();

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
      searchQuery: req.query.search || '',
      activePage: "order"
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
