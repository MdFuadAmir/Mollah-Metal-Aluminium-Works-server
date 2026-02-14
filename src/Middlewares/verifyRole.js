/**
 * Middleware generator to check user role
 * @param {MongoCollection} usersCollection
 * @param {Array} allowedRoles
 */

const verifyRole = (usersCollection, allowedRoles) => {
  return async (req, res, next) => {
    try {
      const email = req.decoded?.email;

      if (!email)
        return res.status(401).json({ message: "Unauthorized: Email missing" });

      const user = await usersCollection.findOne({ email });

      if (!user || !allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "Forbidden: Access denied" });
      }

      req.user = user; // attach full user
      next();
    } catch (err) {
      console.error("Role verification error:", err);
      res
        .status(500)
        .json({ message: "Server error during role verification" });
    }
  };
};

module.exports = verifyRole;
