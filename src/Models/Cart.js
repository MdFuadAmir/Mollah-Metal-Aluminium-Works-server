const { ObjectId } = require("mongodb");
const getCollections = require("../DB/db");

module.exports = (app, client) => {
  const { cartsCollection, } = getCollections(client);

  /* ================= ADD TO CART ================= */
  app.post("/carts", async (req, res) => {
    try {
      const { productId, userEmail, sellType, quantity = 1 } = req.body;
      if (!productId || !userEmail || !sellType) {
        return res.status(400).send({ message: "Missing required data" });
      }
      const exists = await cartsCollection.findOne({
        productId: new ObjectId(productId),
        userEmail,
      });
      if (exists) {
        return res.send({ message: "Product already in cart" });
      }
      const cartItem = {
        productId: new ObjectId(productId),
        userEmail,
        sellType,
        quantity,
        createdAt: new Date(),
      };
      const result = await cartsCollection.insertOne(cartItem);
      res.send(result);
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
      const cartItems = await cartsCollection
        .find({ userEmail })
        .sort({ createdAt: -1 }) 
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
          { $match: { userEmail } }, 
          {
            $lookup: {
              from: "products", 
              localField: "productId", 
              foreignField: "_id", 
              as: "productDetails",
            },
          },
          { $unwind: "$productDetails" }, 
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
