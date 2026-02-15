//===================== dependencies import ====================//
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { MongoClient, ServerApiVersion } = require("mongodb");
dotenv.config();

const Products = require("./src/Models/Products");
const Profile = require("./src/Models/Profile");
const Cart = require("./src/Models/Cart");
const wishlist = require("./src/Models/wishlist");
const Order = require("./src/Models/Order");
const AdminStats = require("./src/Models/AdminStats");
const UserStats = require("./src/Models/UserStats");
const Contact = require("./src/Models/Contact");
const Users = require("./src/Models/Users");
const feedbacks = require("./src/Models/feedbacks");
const Review = require("./src/Models/Review");
//===================== express app setup ====================//
const app = express();
const port = process.env.PORT || 3000;
//===================== middleware ====================//

// MIDDLEWARE
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);
app.options("*", cors());
app.use(express.json());
//===================== FIREBASE MIDDLEWARE =========================//

//===================== MongoDB connection string ====================//
const uri = `mongodb+srv://${process?.env?.DB_USER}:${process?.env?.DB_PASS}@cluster0.sldyvva.mongodb.net/?appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
//======================== main run function =======================//
async function run() {
  try {
    // await client.connect();

    Users(app, client);
    Profile(app, client);
    Products(app, client);
    Cart(app, client);
    wishlist(app, client);
    Order(app, client)
    AdminStats(app, client)
    UserStats(app, client)
    Contact(app, client)
    feedbacks(app, client)
    Review(app, client)
    //==================== MongoDB connection test =================//
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!",
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
//========================= simple root route ========================//
app.get("/", (req, res) => {
  res.send("MMAW server is running");
});
//================= Start server =================//
app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});



