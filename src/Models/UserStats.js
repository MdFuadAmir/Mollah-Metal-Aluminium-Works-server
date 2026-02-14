const getCollections = require("../DB/db");
const verifyToken = require("../Middlewares/verifyToken");
module.exports = (app, client) => {
  const { ordersCollection } = getCollections(client);

  // ===== USER STATS BY EMAIL =====
  app.get("/user/stats/:email",verifyToken, async (req, res) => {
    try {
      const { email } = req.params;

      // Total orders
      const totalOrders = await ordersCollection.countDocuments({ userEmail: email });

      // Pending orders
      const pendingOrders = await ordersCollection.countDocuments({
        userEmail: email,
        status: "pending",
      });

      // Delivered orders
      const deliveredOrders = await ordersCollection.countDocuments({
        userEmail: email,
        status: "delivered",
      });

      
      const spendAgg = await ordersCollection
        .aggregate([
          { $match: { userEmail: email, paymentStatus: "paid" } }, 
          { $group: { _id: null, totalSpend: { $sum: "$totalPrice" } } },
        ])
        .toArray();
      const totalSpend = spendAgg[0]?.totalSpend || 0;

      const recentOrders = await ordersCollection
        .find({ userEmail: email })
        .sort({ createdAt: -1 })
        .limit(7)
        .toArray();

      res.send({
        totalOrders,
        pendingOrders,
        deliveredOrders,
        totalSpend,
        recentOrders,
      });
    } catch (err) {
      console.error("User stats error:", err);
      res.status(500).send({ message: "Failed to load user stats" });
    }
  });
};
