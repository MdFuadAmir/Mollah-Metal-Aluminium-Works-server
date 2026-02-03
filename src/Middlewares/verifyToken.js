const admin = require("../../firebaseAdmin");

const verifyToken = async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return res.status(401).send({ message: "Unauthorized" });
        }

        const token = authHeader.split(" ")[1];
        const decoded = await admin.auth().verifyIdToken(token);

        req.decoded = decoded;
        next();
      } catch (error) {
        console.error("TOKEN ERROR:", error);
        return res.status(401).send({ message: "Unauthorized" });
      }
    };

module.exports = verifyToken;
