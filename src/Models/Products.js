const { ObjectId } = require("mongodb");
const getCollections = require("../DB/db");

module.exports = (app, client) => {
  const { productsCollection } = getCollections(client);

  // CREATE PRODUCT
  app.post("/products", async (req, res) => {
    try {
      const data = req.body;
      const result = await productsCollection.insertOne({
        ...data,
        createdAt: new Date(),
        rating: 0,
      });
      res.send(result);
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  });
  app.get("/products", async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      const category = req.query.category;
      let query = {};
    if (category) {
      query.category = category; // ধরছি product এ category field আছে
    }
    const total = await productsCollection.countDocuments(query);

      const products = await productsCollection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      res.send({
        products,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      });
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  });

  // GET SINGLE PRODUCT
  app.get("/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id))
        return res.status(400).send({ message: "Invalid ID" });

      const product = await productsCollection.findOne({
        _id: new ObjectId(id),
      });
      if (!product)
        return res.status(404).send({ message: "Product not found" });

      res.send(product);
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  });
  // UPDATE PRODUCT
  app.patch("/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = { ...req.body };
      delete data._id; // ensure _id is not modified
      if (!ObjectId.isValid(id))
        return res.status(400).send({ message: "Invalid ID" });
      const result = await productsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: data },
      );
      if (result.matchedCount === 0)
        return res.status(404).send({ message: "Product not found" });
      res.send({ message: "Product updated successfully" });
    } catch (error) {
      console.error(error); // debug
      res.status(500).send({ message: error.message });
    }
  });

  // DELETE PRODUCT
  app.delete("/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id))
        return res.status(400).send({ message: "Invalid ID" });
      const result = await productsCollection.deleteOne({
        _id: new ObjectId(id),
      });
      if (result.deletedCount === 0)
        return res.status(404).send({ message: "Product not found" });
      res.send({ message: "Product deleted successfully" });
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  });
};
