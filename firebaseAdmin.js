const admin = require("firebase-admin");

if (!process.env.FB_SERVICE_KEY) {
  throw new Error("FB_SERVICE_KEY is missing in env");
}

const decoded = Buffer.from(
  process.env.FB_SERVICE_KEY,
  "base64",
).toString("utf8");

const serviceAccount = JSON.parse(decoded);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

module.exports = admin;
