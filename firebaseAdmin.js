// const admin = require("firebase-admin");

// if (!process.env.FB_SERVICE_KEY) {
//   throw new Error("FB_SERVICE_KEY is missing in env");
// }

// const decoded = Buffer.from(
//   process.env.FB_SERVICE_KEY,
//   "base64",
// ).toString("utf8");

// const serviceAccount = JSON.parse(decoded);

// if (!admin.apps.length) {
//   admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//   });
// }

// module.exports = admin;


const admin = require("firebase-admin");

if (!process.env.FB_SERVICE_KEY) {
  throw new Error("FB_SERVICE_KEY is missing in env");
}

let serviceAccount;
try {
  const decoded = Buffer.from(process.env.FB_SERVICE_KEY, "base64").toString("utf8");
  serviceAccount = JSON.parse(decoded);
} catch (e) {
  console.error("Failed to parse FB_SERVICE_KEY", e);
  throw e;
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

module.exports = admin;
