const { ObjectId } = require("mongodb");
const getCollections = require("../DB/db"); // adjust path

module.exports = (app, client) => {
  const { usersCollection } = getCollections(client);
  // =================== GET PROFILE ===================
  // fetch profile by email
  app.get("/users/profile", async (req, res) => {
    try {
      const email = req.query.email; // email query param
      if (!email) return res.status(400).send({ message: "Email is required" });
      const user = await usersCollection.findOne({ email });
      if (!user) return res.status(404).send({ message: "User not found" });
      res.send(user);
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  });
  // =================== UPDATE PROFILE ===================
  app.put("/users/profile", async (req, res) => {
    try {
      const { email, name, phone, city, postCode, address, photoURL } = req.body;
      if (!email) return res.status(400).send({ message: "Email is required" });

      const updateData = {
        name,
        phone,
        city,
        postCode,
        address,
        photoURL,
      };
      const result = await usersCollection.updateOne(
        { email },
        { $set: updateData }
      );
      if (result.matchedCount === 0) {
        return res.status(404).send({ message: "User not found" });
      }
      res.send({
        message: "Profile updated successfully",
        modifiedCount: result.modifiedCount,
      });
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  });
};
