const admin = require("../../firebaseAdmin"); 

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization; 
    if (!authHeader)
      return res.status(401).json({ message: "Authorization header missing" });

    const token = authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Token missing" });

   
    const decodedToken = await admin.auth().verifyIdToken(token);

    req.decoded = decodedToken; 
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(403).json({ message: "Invalid or expired token" });
  }
};

module.exports = verifyToken;
