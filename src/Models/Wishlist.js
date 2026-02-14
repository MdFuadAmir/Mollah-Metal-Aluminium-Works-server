const { ObjectId } = require("mongodb");
const getCollections = require("../DB/db");
module.exports = (app, client) => {
  const { wishlistCollection } = getCollections(client);

  /* ================= GET WISHLIST ================= */
  app.get("/wishlist", async (req, res) => {
    try {
      const userEmail = req.query.email;
      if (!userEmail) return res.status(400).send({ message: "Missing email" });

      const wishlist = await wishlistCollection
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

      res.send({ products: wishlist });
    } catch (err) {
      res.status(500).send({ message: err.message });
    }
  });

  /* ================= ADD/REMOVE WISHLIST ================= */
  app.post("/wishlist", async (req, res) => {
    try {
      const { userEmail, productId } = req.body;
      if (!userEmail || !productId)
        return res.status(400).send({ message: "Missing data" });

      const exists = await wishlistCollection.findOne({
        userEmail,
        productId: new ObjectId(productId),
      });

      if (exists) {
        await wishlistCollection.deleteOne({ _id: exists._id });
        return res.send({ action: "removed" });
      }

      const newItem = {
        userEmail,
        productId: new ObjectId(productId),
        createdAt: new Date(),
      };
      await wishlistCollection.insertOne(newItem);
      res.send({ action: "added" });
    } catch (err) {
      res.status(500).send({ message: err.message });
    }
  });

  /* ================= DELETE WISHLIST ITEM ================= */
  app.delete("/wishlist/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const result = await wishlistCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    } catch (err) {
      res.status(500).send({ message: err.message });
    }
  });
};
