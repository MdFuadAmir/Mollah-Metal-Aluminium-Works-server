const { ObjectId } = require("mongodb");
const getCollections = require("../DB/db"); // adjust path according to your project

module.exports = (app, client) => {
  const { usersCollection } = getCollections(client);

  // =================== GET NORMAL USERS ===================
  app.get("/users/normal-users", async (req, res) => {
    try {
      const users = await usersCollection
        .find({ role: "user" })
        .sort({ createdAt: -1 })
        .toArray();
      res.send(users);
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  });
  // =================== GET ADMINS & MODERATORS ===================
  app.get("/users/admin-moderators", async (req, res) => {
    try {
      const users = await usersCollection
        .find({ role: { $in: ["admin", "moderator"] } })
        .sort({ createdAt: -1 })
        .toArray();
      res.send(users);
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  });
  // =================== GET USER PROFILE ===================
  app.get("/users/profile", async (req, res) => {
    try {
      const email = req.query.email;
      if (!email) return res.status(400).send({ message: "Email is required" });

      const user = await usersCollection.findOne({ email });
      if (!user) return res.status(404).send({ message: "User not found" });

      res.send(user);
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  });
  //  GET user by email
  app.get("/users/:email", async (req, res) => {
    try {
      const { email } = req.params;
      const user = await usersCollection.findOne({ email });
      if (!user) return res.status(404).send({ message: "User not found" });
      res.send(user);
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  });
  // =================== TOGGLE BLOCK / UNBLOCK ===================
  app.patch("/users/toggle-status/:id", async (req, res) => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id))
        return res.status(400).send({ message: "Invalid ID" });

      const user = await usersCollection.findOne({ _id: new ObjectId(id) });
      if (!user) return res.status(404).send({ message: "User not found" });

      const newStatus = user.status === "verified" ? "blocked" : "verified";

      const result = await usersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: newStatus } },
      );

      res.send({
        message: `User status changed to ${newStatus}`,
        modifiedCount: result.modifiedCount,
      });
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  });

  // =================== MAKE MODERATOR ===================
  app.patch("/users/make-moderator/:id", async (req, res) => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id))
        return res.status(400).send({ message: "Invalid ID" });

      const result = await usersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { role: "moderator" } },
      );

      res.send(result);
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  });

  // =================== MAKE ADMIN ===================
  app.patch("/users/make-admin/:id", async (req, res) => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id))
        return res.status(400).send({ message: "Invalid ID" });

      const result = await usersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { role: "admin" } },
      );

      res.send(result);
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  });

  // =================== MAKE USER ===================
  app.patch("/users/make-user/:id", async (req, res) => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id))
        return res.status(400).send({ message: "Invalid ID" });

      const result = await usersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { role: "user" } },
      );

      res.send(result);
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  });

  // =================== DELETE USER ===================
  app.delete("/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id))
        return res.status(400).send({ message: "Invalid ID" });

      const result = await usersCollection.deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0)
        return res.status(404).send({ message: "User not found" });

      res.send({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  });
};
