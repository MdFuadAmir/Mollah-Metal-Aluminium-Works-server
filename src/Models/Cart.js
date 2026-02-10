const { ObjectId } = require("mongodb");
const getCollections = require("../DB/db");

module.exports = (app, client) => {
  const { cartsCollection, productsCollection } = getCollections(client);

  /* ================= ADD TO CART ================= */
  app.post("/carts", async (req, res) => {
    try {
      const { productId, userEmail, sellType, quantity = 1 } = req.body;
      // Validation
      if (!productId || !userEmail || !sellType) {
        return res.status(400).send({ message: "Missing required data" });
      }
      // Check if already in cart
      const exists = await cartsCollection.findOne({
        productId: new ObjectId(productId),
        userEmail,
      });
      if (exists) {
        return res.send({ message: "Product already in cart" });
      }
      // Prepare cart item
      const cartItem = {
        productId: new ObjectId(productId),
        userEmail,
        sellType,
        quantity,
        createdAt: new Date(),
      };
      const result = await cartsCollection.insertOne(cartItem);
      res.send(result); // res.data.insertedId frontend এ ব্যবহার করা যাবে
    } catch (err) {
      res.status(500).send({ message: err.message });
    }
  });
  /* ================= GET CART ITEMS ================= */
  app.get("/carts", async (req, res) => {
    try {
      const userEmail = req.query.email;
      if (!userEmail) {
        return res.status(400).send({ message: "Missing user email" });
      }
      // Fetch all cart items for this user
      const cartItems = await cartsCollection
        .find({ userEmail })
        .sort({ createdAt: -1 }) // newest first
        .toArray();

      res.send(cartItems);
    } catch (err) {
      res.status(500).send({ message: err.message });
    }
  });
  /* ================= UPDATE CART QUANTITY ================= */
  app.put("/carts/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const { quantity } = req.body;

      if (quantity < 1) {
        return res.status(400).send({ message: "Quantity must be at least 1" });
      }

      const result = await cartsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { quantity } },
      );

      if (result.modifiedCount === 1) {
        res.send({ message: "Quantity updated successfully" });
      } else {
        res.status(404).send({ message: "Cart item not found" });
      }
    } catch (err) {
      res.status(500).send({ message: err.message });
    }
  });
  app.get("/carts-with-details", async (req, res) => {
    try {
      const userEmail = req.query.email;
      if (!userEmail)
        return res.status(400).send({ message: "Missing user email" });

      const cartItems = await cartsCollection
        .aggregate([
          { $match: { userEmail } }, // user-specific cart
          {
            $lookup: {
              from: "products", // products collection
              localField: "productId", // cart.productId
              foreignField: "_id", // products._id
              as: "productDetails",
            },
          },
          { $unwind: "$productDetails" }, // convert array to object
          { $sort: { createdAt: -1 } },
        ])
        .toArray();

      res.send(cartItems);
    } catch (err) {
      res.status(500).send({ message: err.message });
    }
  });
  /* ================= DELETE CART ================= */
  app.delete("/carts/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const result = await cartsCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    } catch (err) {
      res.status(500).send({ message: err.message });
    }
  });
};
