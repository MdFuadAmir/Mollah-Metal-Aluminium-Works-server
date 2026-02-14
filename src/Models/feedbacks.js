const getCollections = require("../DB/db");
const { ObjectId } = require("mongodb");
const nodemailer = require("nodemailer");
const verifyToken = require("../Middlewares/verifyToken");
const verifyRole = require("../Middlewares/verifyRole");

module.exports = (app, client) => {
  const { feedbacksCollection,usersCollection } = getCollections(client);
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  app.post("/feedbacks", async (req, res) => {
    try {
      const { email, name, rating, feedback } = req.body;
      if (!email || !name || !feedback) {
        return res.status(400).send({ message: "Required fields missing" });
      }
      const newFeedback = {
        email,
        name,
        rating,
        feedback,
        status: "requested",
        createdAt: new Date(),
      };
      const result = await feedbacksCollection.insertOne(newFeedback);
      // ===== EMAIL CONTENT (updated) =====
      const mailOptions = {
        from: `"মোল্লা মেটাল অ্যালুমিনিয়াম ওয়ার্কস" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Thank you for your feedback 💙",
        html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>হ্যালো ${name},</h2>
          <p>আপনার মূল্যবান মতামত শেয়ার করার জন্য ধন্যবাদ। আমরা আপনার প্রতিক্রিয়া অনেক গুরুত্ব দিচ্ছি।</p>
          <p><strong>আপনার মতামত:</strong></p>
          <blockquote style="background:#f4f4f4;padding:10px;border-left:4px solid #0ea5e9;">
            ${feedback}
          </blockquote>
          <p>আমরা আপনার মন্তব্যগুলো মনোযোগ দিয়ে পর্যালোচনা করব এবং আমাদের MMAW পণ্যের মান ও সেবা উন্নত করতে ব্যবহার করব।</p>
          <p>প্রয়োজনে আমরা আরও বিস্তারিত জানতে আপনার সাথে যোগাযোগ করতে পারি।</p>
          <br/>
          <p>
            সাদর সম্ভাষণ,<br/>
            <strong>মোল্লা মেটাল অ্যালুমিনিয়াম ওয়ার্কস</strong><br/>
             MMAW Team
          </p>
        </div>
      `,
      };
      await transporter.sendMail(mailOptions);
      res.send({
        success: true,
        message: "Feedback submitted and email sent successfully",
        result,
      });
    } catch (error) {
      res.status(500).send({ message: "Failed to submit feedback" });
    }
  });
  app.get("/feedbacks", async (req, res) => {
    try {
      const result = await feedbacksCollection
        .find()
        .sort({
          status: 1,
          createdAt: -1,
        })
        .toArray();
      res.send(result);
    } catch (err) {
      res.status(500).send({ message: "Failed to fetch feedbacks" });
    }
  });
  // ===== PATCH: toggle status =====
  app.patch(
    "/feedbacks/:id",
    verifyToken,
    verifyRole(usersCollection, ["admin", "moderator"]),
    async (req, res) => {
      const { id } = req.params;
      const feedback = await feedbacksCollection.findOne({
        _id: new ObjectId(id),
      });
      if (!feedback) {
        return res.status(404).send({ message: "Feedback not found" });
      }
      const newStatus =
        feedback.status === "requested" ? "active" : "requested";
      const result = await feedbacksCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: newStatus } },
      );
      res.send(result);
    },
  );
  // ===== DELETE feedback =====
  app.delete(
    "/feedbacks/:id",
    verifyToken,
    verifyRole(usersCollection, ["admin", "moderator"]),
    async (req, res) => {
      const { id } = req.params;
      const result = await feedbacksCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    },
  );
};
