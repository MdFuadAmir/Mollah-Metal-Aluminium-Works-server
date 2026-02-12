const { ObjectId } = require("mongodb");
const getCollections = require("../DB/db");

module.exports = (app, client) => {
  const { usersCollection, productsCollection, ordersCollection } =
    getCollections(client);
  // ===== ADMIN STATS =====
  app.get("/admin/stats", async (req, res) => {
    try {
      const totalUsers = await usersCollection.countDocuments({
        role: "user",
        status: "verified",
      });
      const totalAdmins = await usersCollection.countDocuments({
        role: "admin",
        status: "verified",
      });
      const totalModerators = await usersCollection.countDocuments({
        role: "moderator",
        status: "verified",
      });
      const totalProducts = await productsCollection.countDocuments();
      const totalOrders = await ordersCollection.countDocuments();
      const deliveredOrders = await ordersCollection.countDocuments({
        status: "delivered",
      });
      const requestedOrders = await ordersCollection.countDocuments({
        status: "requested",
      });
      const revenueAgg = await ordersCollection
        .aggregate([
          { $match: { paymentStatus: "paid" } },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: "$totalPrice" },
            },
          },
        ])
        .toArray();

      const totalRevenue = revenueAgg[0]?.totalRevenue || 0;

      res.send({
        totalUsers,
        totalAdmins,
        totalModerators,
        totalProducts,
        totalOrders,
        deliveredOrders,
        requestedOrders,
        totalRevenue,
      });
    } catch (err) {
      console.error("Admin stats error:", err);
      res.status(500).send({ message: "Failed to load admin stats" });
    }
  });
  // ===== RECENT ORDERS =====
  app.get("/admin/recent-orders", async (req, res) => {
    try {
      const recentOrders = await ordersCollection
        .find()
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray();

      res.send(recentOrders);
    } catch (err) {
      console.error("Recent orders error:", err);
      res.status(500).send({ message: "Failed to fetch recent orders" });
    }
  });
  // ===== ORDER STATS (CHART) =====
  app.get("/admin/order-stats", async (req, res) => {
    try {
      // Aggregate orders by day of week
      const result = await ordersCollection
        .aggregate([
          {
            $group: {
              _id: { $dayOfWeek: "$createdAt" }, // 1 = Sunday, 7 = Saturday
              orders: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .toArray();

      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

      // Fill missing days with 0
      const formatted = days.map((day, index) => {
        const dayData = result.find((r) => r._id === index + 1);
        return {
          name: day,
          orders: dayData ? dayData.orders : 0,
        };
      });

      res.send(formatted);
    } catch (err) {
      console.error("Order stats error:", err);
      res.status(500).send({ message: "Order stats error" });
    }
  });
  // ===== ORDER STATS (CHART) =====
  app.get("/admin/revenue-stats", async (req, res) => {
    try {
      const result = await ordersCollection
        .aggregate([
          { $match: { paymentStatus: "paid" } },
          {
            $group: {
              _id: { $month: "$createdAt" },
              revenue: { $sum: "$totalPrice" },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .toArray();

      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      // Fill missing months with 0 revenue
      const formatted = months.map((m, index) => {
        const monthData = result.find((r) => r._id === index + 1);
        return { name: m, revenue: monthData ? monthData.revenue : 0 };
      });

      res.send(formatted);
    } catch (err) {
      console.error(err);
      res.status(500).send({ message: "Revenue stats error" });
    }
  });
};
