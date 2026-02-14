const getCollections = require("../DB/db");
const { ObjectId } = require("mongodb");
const nodemailer = require("nodemailer");
const verifyToken = require("../Middlewares/verifyToken");
const verifyRole = require("../Middlewares/verifyRole");
module.exports = (app, client) => {
  const { contactsCollection, usersCollection } = getCollections(client);

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  app.post("/contacts", async (req, res) => {
    try {
      const { name, email, message } = req.body;

      if (!name || !email || !message) {
        return res
          .status(400)
          .send({ success: false, message: "All fields are required" });
      }
      const result = await contactsCollection.insertOne({
        name,
        email,
        message,
        status: "unread",
        createdAt: new Date(),
      });

      const mailOptions = {
        from: `"Fuad Amir" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "আপনার বার্তার জন্য ধন্যবাদ!",
        html: `
          <h2>Hi ${name},</h2>
          <p>আপনার বার্তা আমাদের কাছে পৌঁছেছে। আমরা আপনার মন্তব্য গ্রহণ করেছি:</p>
          <blockquote>${message}</blockquote>
          <p>আমরা যত দ্রুত সম্ভব আপনার সঙ্গে যোগাযোগ করব।</p>
          <br/>
          <p>সাদর সম্ভাষণ,<br/><strong>মোল্লা মেটাল অ্যালুমিনিয়াম ওয়ার্কস (MMAW)</strong></p>
        `,
      };

      await transporter.sendMail(mailOptions);

      res.status(201).send({
        success: true,
        message: "Message sent successfully",
        data: result,
      });
    } catch (error) {
      console.error("Contact POST error:", error);
      res.status(500).send({ success: false, error: error.message });
    }
  });
  // ================= GET ALL CONTACTS (ADMIN) =================
  app.get("/contacts", verifyToken, async (req, res) => {
    try {
      const messages = await contactsCollection
        .find()
        .sort({ createdAt: -1 })
        .toArray();

      res.send({
        success: true,
        data: messages,
      });
    } catch (error) {
      res.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });
  // ================= MARK AS READ =================
  app.patch(
    "/contacts/:id",
    verifyToken,
    verifyRole(usersCollection, ["admin", "moderator"]),
    async (req, res) => {
      try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({
            success: false,
            message: "Invalid ID",
          });
        }
        const result = await contactsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status: "read" } },
        );
        if (result.matchedCount === 0) {
          return res.status(404).send({
            success: false,
            message: "Message not found",
          });
        }
        res.send({
          success: true,
          message: "Message marked as read",
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          error: error.message,
        });
      }
    },
  );
  // ================= DELETE CONTACT =================
  app.delete(
    "/contacts/:id",
    verifyToken,
    verifyRole(usersCollection, ["admin", "moderator"]),
    async (req, res) => {
      try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({
            success: false,
            message: "Invalid ID",
          });
        }
        const result = await contactsCollection.deleteOne({
          _id: new ObjectId(id),
        });
        if (result.deletedCount === 0) {
          return res.status(404).send({
            success: false,
            message: "Message not found",
          });
        }
        res.send({
          success: true,
          message: "Message deleted successfully",
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          error: error.message,
        });
      }
    },
  );
};
