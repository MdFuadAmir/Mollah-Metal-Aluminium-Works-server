module.exports = (client) => {
   const db = client.db("MMAW");

  return {
    usersCollection: db.collection("users"),
    productsCollection: db.collection("products"),
    cartsCollection: db.collection("carts"),
    wishlistCollection: db.collection("wishlist"),
    ordersCollection: db.collection("orders"),
    contactsCollection: db.collection("contacts"),
    feedbacksCollection: db.collection("feedbacks"),
    reviewsCollection: db.collection("reviews"),
  };
};