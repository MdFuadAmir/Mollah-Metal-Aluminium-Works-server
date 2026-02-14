const { ObjectId } = require("mongodb");
const getCollections = require("../DB/db");
const verifyToken = require("../Middlewares/verifyToken");
const verifyRole = require("../Middlewares/verifyRole");

module.exports = (app, client) => {
  const { ordersCollection, cartsCollection, usersCollection } =
    getCollections(client);
  const verifyAdmin = verifyRole(usersCollection, ["admin", "moderator"]);

  // ================= CREATE ORDER ==================
  app.post("/orders", verifyToken, async (req, res) => {
    try {
      const {
        userEmail,
        cartItems,
        paymentMethod,
        paymentStatus,
        shippingInfo,
      } = req.body;
      if (!userEmail || !cartItems || !paymentMethod) {
        return res
          .status(400)
          .json({ success: false, message: "Missing fields" });
      }
      const totalPrice = cartItems.reduce((sum, item) => {
        const isWholesale = item.quantity >= 100;
        let price = 0;
        if (item.sellType === "kg") {
          if (isWholesale) {
            price =
              Number(item.productDetails.KgWholeSellDiscountPrice) ||
              Number(item.productDetails.KgwholesalePrice) ||
              0;
          } else {
            price =
              Number(item.productDetails.KgretailDiscountPrice) ||
              Number(item.productDetails.KgretailPrice) ||
              0;
          }
        } else {
          if (isWholesale) {
            price =
              Number(item.productDetails.PWholeSellDiscountPrice) ||
              Number(item.productDetails.PwholesalePrice) ||
              0;
          } else {
            price =
              Number(item.productDetails.PretailDiscountPrice) ||
              Number(item.productDetails.PretailPrice) ||
              0;
          }
        }
        return sum + price * Number(item.quantity);
      }, 0);
      const order = {
        userEmail,
        cartItems,
        totalPrice,
        paymentMethod,
        paymentStatus: paymentStatus || "pending",
        shippingInfo: shippingInfo || {},
        trackingId:
          "TRK-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
        status: "requested",
        createdAt: new Date(),
      };
      const result = await ordersCollection.insertOne(order);
      if (paymentMethod === "cash-on-delivery" || paymentStatus === "paid") {
        await cartsCollection.deleteMany({ userEmail: userEmail });
      }
      res.status(201).json({
        success: true,
        orderId: result.insertedId,
        trackingId: order.trackingId,
      });
    } catch (err) {
      console.log(err);
      res.status(500).json({ success: false, message: "Server Error" });
    }
  });
  //=====
  app.get("/admin/order/:id", verifyToken, verifyAdmin, async (req, res) => {
    const id = req.params.id;
    const order = await ordersCollection.findOne({
      _id: new ObjectId(id),
    });
    if (!order) {
      return res.status(404).send({ message: "Order not found" });
    }
    res.send(order);
  });
  // ====
  app.get("/orders", verifyToken, async (req, res) => {
    try {
      const email = req.query.email;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 5;
      if (!email) {
        return res.status(400).send({ products: [], totalPages: 0 });
      }
      const query = { userEmail: email };
      const totalOrders = await ordersCollection.countDocuments(query);
      const totalPages = Math.ceil(totalOrders / limit);
      const orders = await ordersCollection
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray();
      res.send({
        products: orders,
        totalPages,
      });
    } catch (error) {
      console.error("Get orders error:", error);
      res.status(500).send({ products: [], totalPages: 0 });
    }
  });
  // ====
  app.get("/admin/orders", verifyToken, verifyAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const status = req.query.status;
      let query = {};
      if (status) {
        query.status = status;
      }
      const totalOrders = await ordersCollection.countDocuments(query);
      const totalPages = Math.ceil(totalOrders / limit);
      const orders = await ordersCollection
        .find(query)
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray();
      res.send({
        products: orders,
        totalPages,
      });
    } catch (error) {
      console.error("Admin get orders error:", error);
      res.status(500).send({ products: [], totalPages: 0 });
    }
  });
  //=====
  app.get("/orders/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).send({ message: "Order ID required" });
    try {
      const order = await ordersCollection.findOne({ _id: new ObjectId(id) });
      if (!order) return res.status(404).send({ message: "Order not found" });
      res.send(order);
    } catch (err) {
      console.error(err);
      res.status(500).send({ message: "Server error" });
    }
  });
  //=====
  app.patch(
    "/admin/orders/accept/:id",
    verifyToken,
    verifyAdmin,
    async (req, res) => {
      const id = req.params.id;
      const { updatedCartItems, updatedTotalPrice } = req.body;

      const result = await ordersCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            cartItems: updatedCartItems,
            totalPrice: updatedTotalPrice,
            status: "pending",
            acceptedAt: new Date(),
          },
        },
      );

      res.send(result);
    },
  );
  // =====
  app.patch("/orders/cancel/:id", verifyToken, async (req, res) => {
    const id = req.params.id;
    const result = await ordersCollection.updateOne(
      { _id: new ObjectId(id), status: { $ne: "delivered" } },
      {
        $set: {
          status: "canceled",
          canceledAt: new Date(),
        },
      },
    );
    res.send(result);
  });
  // =====
  app.patch(
    "/orders/update-status/:id",
    verifyToken,
    verifyAdmin,
    async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;
      const updateFields = { status };
      if (status === "delivered") {
        updateFields.paymentStatus = "paid";
        updateFields.deliveredAt = new Date();
      }
      try {
        const result = await ordersCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateFields },
        );
        if (result.modifiedCount > 0) {
          res.json({ success: true, message: "Status updated successfully" });
        } else {
          res.status(400).json({ success: false, message: "No changes made" });
        }
      } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error" });
      }
    },
  );
  // =====
  app.patch(
    "/admin/update-order-item/:orderId/:itemId",
    verifyToken,
    verifyAdmin,
    async (req, res) => {
      const { orderId, itemId } = req.params;
      const { quantity } = req.body;
      if (!quantity || quantity <= 0) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid quantity" });
      }
      try {
        const order = await ordersCollection.findOne({
          _id: new ObjectId(orderId),
        });
        if (!order) {
          return res
            .status(404)
            .json({ success: false, message: "Order not found" });
        }
        const itemIndex = order.cartItems.findIndex(
          (ci) => ci._id.toString() === itemId,
        );
        if (itemIndex === -1) {
          return res
            .status(404)
            .json({ success: false, message: "Cart item not found" });
        }
        order.cartItems[itemIndex].quantity = Number(quantity);
        const totalPrice = order.cartItems.reduce((sum, item) => {
          const qty = Number(item.quantity);
          let price = 0;
          if (item.sellType === "kg") {
            const isWholesale = qty >= 100;
            price = isWholesale
              ? Number(item.productDetails.KgWholeSellDiscountPrice) ||
                Number(item.productDetails.KgwholesalePrice) ||
                0
              : Number(item.productDetails.KgretailDiscountPrice) ||
                Number(item.productDetails.KgretailPrice) ||
                0;
          } else {
            const isWholesale = qty >= 100;
            price = isWholesale
              ? Number(item.productDetails.PWholeSellDiscountPrice) ||
                Number(item.productDetails.PwholesalePrice) ||
                0
              : Number(item.productDetails.PretailDiscountPrice) ||
                Number(item.productDetails.PretailPrice) ||
                0;
          }
          return sum + price * qty;
        }, 0);
        await ordersCollection.updateOne(
          { _id: new ObjectId(orderId) },
          {
            $set: {
              cartItems: order.cartItems,
              totalPrice,
            },
          },
        );
        res.json({ success: true, message: "Quantity updated" });
      } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error" });
      }
    },
  );
  // =====
  app.patch("/orders/return/:id", verifyToken, async (req, res) => {
    const id = req.params.id;

    try {
      const result = await ordersCollection.updateOne(
        { _id: new ObjectId(id), status: "delivered" },
        {
          $set: {
            status: "return_requested",
            returnRequestedAt: new Date(),
          },
        },
      );

      res.send(result);
    } catch (err) {
      console.error("Return request error:", err);
      res.status(500).send({ message: "Server error" });
    }
  });
  // =====
  app.delete("/carts/by-user", verifyToken, async (req, res) => {
    try {
      const email = req.query.email;
      console.log("DELETE /carts/by-user email:", email);
      if (!email) {
        return res.status(400).send({ message: "Email is required" });
      }
      const result = await cartsCollection.deleteMany({ userEmail: email });
      console.log("Deleted count:", result.deletedCount);

      res.send(result);
    } catch (error) {
      console.error("Delete cart error:", error);
      res.status(500).send({ message: "Failed to delete cart items" });
    }
  });
};
