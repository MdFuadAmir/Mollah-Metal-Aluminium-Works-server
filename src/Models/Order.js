const { ObjectId } = require("mongodb");
const getCollections = require("../DB/db");

module.exports = (app, client) => {
  const { ordersCollection, cartsCollection } = getCollections(client);

  // ================= CREATE ORDER ==================
  // app.post("/orders", async (req, res) => {
  //   try {
  //     const {
  //       userEmail,
  //       cartItems,
  //       totalPrice,
  //       paymentMethod,
  //       paymentStatus,
  //       shippingInfo,
  //     } = req.body;

  //     if (!userEmail || !cartItems || !totalPrice || !paymentMethod)
  //       return res
  //         .status(400)
  //         .json({ success: false, message: "Missing required fields" });

  //     const order = {
  //       userEmail,
  //       cartItems,
  //       totalPrice,
  //       paymentMethod,
  //       paymentStatus: paymentStatus || "pending",
  //       shippingInfo: shippingInfo || {},
  //       trackingId:
  //         "TRK-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
  //       status: "requested",
  //       createdAt: new Date(),
  //     };

  //     const result = await ordersCollection.insertOne(order);

  //     if (paymentMethod === "cash-on-delivery" || paymentStatus === "paid") {
  //       await cartsCollection.deleteMany({ userEmail: userEmail });
  //     }

  //     res.status(201).json({
  //       success: true,
  //       orderId: result.insertedId,
  //       trackingId: order.trackingId,
  //     });
  //   } catch (err) {
  //     console.log(err);
  //     res.status(500).json({ success: false, message: "Server Error" });
  //   }
  // });
  app.post("/orders", async (req, res) => {
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

      // ✅ SERVER SIDE TOTAL CALCULATION
      const totalPrice = cartItems.reduce((sum, item) => {
        const price =
          item.sellType === "kg"
            ? Number(
                item.productDetails.KgretailDiscountPrice ||
                  item.productDetails.KgretailPrice,
              )
            : Number(
                item.productDetails.PretailDiscountPrice ||
                  item.productDetails.PretailPrice,
              );

        return sum + price * Number(item.quantity);
      }, 0);

      const order = {
        userEmail,
        cartItems,
        totalPrice, // ✅ always correct now
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

  app.get("/admin/order/:id", async (req, res) => {
    const id = req.params.id;
    const order = await ordersCollection.findOne({
      _id: new ObjectId(id),
    });
    if (!order) {
      return res.status(404).send({ message: "Order not found" });
    }
    res.send(order);
  });
  //=====
  app.patch("/admin/orders/accept/:id", async (req, res) => {
    const id = req.params.id;
    const { updatedCartItems, updatedTotalPrice } = req.body;

    const result = await ordersCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          cartItems: updatedCartItems, // admin edited prices/weights
          totalPrice: updatedTotalPrice,
          status: "pending", // ✅ accepted
          acceptedAt: new Date(),
        },
      },
    );

    res.send(result);
  });
  // ====
  app.get("/orders", async (req, res) => {
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
  // ================= ADMIN / MODERATOR GET ALL ORDERS =================
  app.get("/admin/orders", async (req, res) => {
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
  // =====
  app.patch("/orders/cancel/:id", async (req, res) => {
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
  //=====
  app.get("/orders/:id", async (req, res) => {
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
  // =====
  app.patch("/orders/update-status/:id", async (req, res) => {
    const id = req.params.id;
    const { status } = req.body;

    const result = await ordersCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: status } },
    );

    res.send(result);
  });
  // =====
  app.patch("/admin/update-order-item/:orderId/:itemId", async (req, res) => {
    try {
      const { orderId, itemId } = req.params;
      const { quantity } = req.body;

      if (!quantity || quantity <= 0) {
        return res.status(400).send({ message: "Invalid quantity" });
      }

      const order = await ordersCollection.findOne({
        _id: new ObjectId(orderId),
        // "cartItems._id": itemId, 
        "cartItems._id": new ObjectId(itemId), 
      });

      if (!order) {
        return res.status(404).send({ message: "Order or item not found" });
      }

      // const item = order.cartItems.find((i) => i._id === itemId);
      const item = order.cartItems.find((i) => i._id.toString() === itemId);
      if (!item) return res.status(404).send({ message: "Item not found" });

      const product = item.productDetails;

      let availableStock =
        item.sellType === "kg"
          ? Number(product.Kgstock || 0)
          : Number(product.Pstock || 0);

      if (quantity > availableStock) {
        return res.status(400).send({
          message: `Only ${availableStock} ${item.sellType} available`,
        });
      }

      const pricePerUnit =
        item.sellType === "kg"
          ? Number(product.KgretailDiscountPrice)
          : Number(product.PretailDiscountPrice);

      const newItemTotal = quantity * pricePerUnit;

      await ordersCollection.updateOne(
        { _id: new ObjectId(orderId), "cartItems._id": itemId },
        {
          $set: {
            "cartItems.$.quantity": quantity,
            "cartItems.$.itemTotal": newItemTotal,
          },
        },
      );

      const updatedOrder = await ordersCollection.findOne({
        _id: new ObjectId(orderId),
      });

      const newOrderTotal = updatedOrder.cartItems.reduce((sum, i) => {
        const unitPrice =
          i.sellType === "kg"
            ? Number(i.productDetails.KgretailDiscountPrice)
            : Number(i.productDetails.PretailDiscountPrice);

        return sum + i.quantity * unitPrice;
      }, 0);

      await ordersCollection.updateOne(
        { _id: new ObjectId(orderId) },
        { $set: { totalPrice: newOrderTotal } },
      );

      res.send({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).send({ message: "Server error" });
    }
  });

  // =====
  app.delete("/carts/by-user", async (req, res) => {
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
