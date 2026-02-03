// src/Middlewares/verifyAdmin.js
module.exports = (usersCollection) => {
  return async (req, res, next) => {
    try {
      const email = req.decoded?.email;

      if (!email) {
        return res.status(401).send({ message: "Unauthorized" });
      }

      const user = await usersCollection.findOne({ email });

      if (!user || user.role !== "admin") {
        return res.status(403).send({ message: "Forbidden: Admin only" });
      }

      next();
    } catch (error) {
      console.error("Admin verify error:", error);
      res.status(500).send({ message: "Server error during admin check" });
    }
  };
};
