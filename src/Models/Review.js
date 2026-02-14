const { ObjectId } = require("mongodb");
const getCollections = require("../DB/db");
const verifyToken = require("../Middlewares/verifyToken");
module.exports = (app, client) => {
  const { reviewsCollection, productsCollection } =
    getCollections(client);

  // POST a new review
  app.post("/reviews", verifyToken, async (req, res) => {
    try {
      const { orderId, reviews, userEmail } = req.body;
      if (!orderId || !reviews || !userEmail) {
        return res.status(400).send({ message: "Required fields missing" });
      }

      // 1️⃣ Save review to reviews collection
      const newReview = {
        orderId,
        userEmail,
        reviews,
        createdAt: new Date(),
      };
      const result = await reviewsCollection.insertOne(newReview);

      // 2️⃣ Update product rating for each product in the review
      for (const item of reviews) {
        const productId = item.productId;

        // Fetch all reviews for this product
        const productReviews = await reviewsCollection
          .find({ "reviews.productId": productId })
          .toArray();

        // Get all ratings for this product
        const allRatings = productReviews.flatMap((r) =>
          r.reviews
            .filter((rev) => rev.productId === productId)
            .map((rev) => Number(rev.rating)),
        );

        // Calculate average rating
        const avgRating =
          allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length || 0;

        // Update product document
        await productsCollection.updateOne(
          { _id: new ObjectId(productId) },
          { $set: { rating: Number(avgRating.toFixed(1)) } },
        );
      }

      res.send({
        success: true,
        message: "Reviews submitted successfully and product ratings updated",
        result,
      });
    } catch (error) {
      console.error("Error saving review:", error);
      res.status(500).send({ message: "Server error while saving review" });
    }
  });
  // GET reviews by productId (with pagination)
  app.get("/reviews/product/:productId", async (req, res) => {
    try {
      const { productId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 5;
      const skip = (page - 1) * limit;
      const query = { "reviews.productId": productId };

      const total = await reviewsCollection.countDocuments(query);
      const reviews = await reviewsCollection
        .find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .toArray();

      res.send({
        reviews,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      console.error("Error fetching product reviews:", error);
      res
        .status(500)
        .send({ message: "Server error while fetching product reviews" });
    }
  });
};
