const { ObjectId } = require("mongodb");
const getCollections = require("../DB/db"); // adjust path according to your project
const verifyToken = require("../Middlewares/verifyToken");
const verifyRole = require("../Middlewares/verifyRole");
module.exports = (app, client) => {
  const { usersCollection } = getCollections(client);
  const verifyAdmin = verifyRole(usersCollection, ["admin"]);

  // =================== GET USER PROFILE ===================
  app.get("/users/profile", verifyToken, async (req, res) => {
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
  //====================  GET user by email =================
  app.get("/users/:email", verifyToken, async (req, res) => {
    try {
      const { email } = req.params;
      const user = await usersCollection.findOne({ email });
      if (!user) return res.status(404).send({ message: "User not found" });
      res.send(user);
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  });
  // =================== GET NORMAL USERS (WITH PAGINATION) ===================
  app.get("/users/normal-users", verifyToken, verifyAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const query = { role: "user" };

      const total = await usersCollection.countDocuments(query);

      const users = await usersCollection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      res.send({
        users,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      });
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  });
  // =================== GET ADMINS & MODERATORS (WITH PAGINATION) ===================
  app.get(
    "/users/admin-moderators",
    verifyToken,
    verifyAdmin,
    async (req, res) => {
      try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const query = { role: { $in: ["admin", "moderator"] } };

        const total = await usersCollection.countDocuments(query);

        const users = await usersCollection
          .find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray();

        res.send({
          users,
          total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
        });
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    },
  );
  // =================== TOGGLE BLOCK / UNBLOCK ===================
  app.patch(
    "/users/toggle-status/:id",
    verifyToken,
    verifyAdmin,
    async (req, res) => {
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
    },
  );
  // =================== MAKE MODERATOR ===================
  app.patch(
    "/users/make-moderator/:id",
    verifyToken,
    verifyAdmin,
    async (req, res) => {
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
    },
  );
  // =================== MAKE ADMIN ===================
  app.patch(
    "/users/make-admin/:id",
    verifyToken,
    verifyAdmin,
    async (req, res) => {
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
    },
  );
  // =================== MAKE USER ===================
  app.patch(
    "/users/make-user/:id",
    verifyToken,
    verifyAdmin,
    async (req, res) => {
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
    },
  );
  // =================== DELETE USER ===================
  app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
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
