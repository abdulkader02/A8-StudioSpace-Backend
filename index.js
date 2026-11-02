import "dotenv/config";
import cors from "cors";
import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import { createRemoteJWKSet, jwtVerify } from "jose";
const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URI);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.error("MongoDB Connection Error:", err);
    throw err;
  }
}

const mongoClient = await connectToMongoDB();
const db = mongoClient.db("studio");

const studioCollection = db.collection("studio");
const bookingCollection = db.collection("bookings");

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ msg: "Unauthorized!" });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).send({ msg: "Unauthorized!" });
  }

  const JWKS = createRemoteJWKSet(
    new URL(`${process.env.CLIENT_URL}/api/auth/jwks`),
  );

  try { 
    const { payload } = await jwtVerify(token, JWKS);
    next();
  } catch (error) {
    return res.status(500).send({ msg: "Server Error!" });
  }
};

// ======================================
// FEATURED STUDIOS API
// ======================================

app.get("/featured-studios", async (req, res) => {
  try {
    const result = await studioCollection
      .find({
        isPublished: true,
      })
      .sort({
        rating: -1,
        createdAt: -1,
        _id: -1,
      })
      .limit(6)
      .toArray();

    res.status(200).send(result);
  } catch (error) {
    console.error("Fetch Featured Studios Error:", error);

    res.status(500).send({
      success: false,
      message: "Unable to fetch featured studios.",
    });
  }
});

// ======================================
// ALL STUDIOS
// ======================================

app.get("/studios", async (req, res) => {
  try {
    const result = await studioCollection.find().toArray();
    res.send(result);
  } catch (error) {
    console.error("Fetch Studios Error:", error);
    res.status(500).send({
      success: false,
      message: "Unable to fetch studios.",
    });
  }
});

// ======================================
// ADD STUDIO
// ======================================

app.post("/add-studio", verifyToken, async (req, res) => {
  try {
    const data = req.body;

    const result = await studioCollection.insertOne(data);

    console.log("New Studio Added:", result.insertedId);

    res.status(201).send({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Add Studio Error:", error);

    res.status(500).send({
      success: false,
      message: "Unable to add studio.",
    });
  }
});

// ======================================
// SINGLE STUDIO
// ======================================

app.get("/studio/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid studio ID.",
      });
    }

    const result = await studioCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!result) {
      return res.status(404).send({
        success: false,
        message: "Studio not found.",
      });
    }

    res.send(result);
  } catch (error) {
    console.error("Fetch Single Studio Error:", error);

    res.status(500).send({
      success: false,
      message: "Unable to fetch studio.",
    });
  }
});

// ======================================
// UPDATE STUDIO
// ======================================

app.patch("/studio/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid studio ID.",
      });
    }

    const result = await studioCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedData },
    );

    res.json(result);
  } catch (error) {
    console.error("Update Studio Error:", error);

    res.status(500).send({
      success: false,
      message: "Unable to update studio.",
    });
  }
});

// ======================================
// DELETE STUDIO PROTECTED
// ======================================

app.delete("/studio/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid studio ID.",
      });
    }

    const result = await studioCollection.deleteOne({
      _id: new ObjectId(id),
    });

    res.json(result);
  } catch (error) {
    console.error("Delete Studio Error:", error);

    res.status(500).send({
      success: false,
      message: "Unable to delete studio.",
    });
  }
});

// ======================================
// CREATE BOOKING PROTECTED
// ======================================

app.post("/booking", verifyToken, async (req, res) => {
  try {
    const data = req.body;

    if (
      !data.studioId ||
      !data.date ||
      !data.startTime ||
      !data.duration ||
      !data.crewCount ||
      !data.user?.email
    ) {
      return res.status(400).send({
        success: false,
        message: "Missing required booking information.",
      });
    }

    // Check if user already has an active booking for this studio
    const existingBooking = await bookingCollection.findOne({
      studioId: data.studioId,
      "user.email": data.user.email,
      status: { $in: ["Pending", "Confirmed"] },
    });

    if (existingBooking) {
      return res.status(409).send({
        success: false,
        message: "This studio is already in your booking list!",
      });
    }

    const bookingData = {
      ...data,
      status: "Pending",
      createdAt: new Date(),
    };

    const result = await bookingCollection.insertOne(bookingData);

    res.status(201).send({
      success: true,
      message: "Booking request submitted successfully!",
      result,
    });
  } catch (error) {
    console.error("Booking creation error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to create booking.",
    });
  }
});

// ======================================
// MY BOOKINGS
// ======================================

app.get("/my-bookings/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const result = await bookingCollection
      .find({ "user.email": email })
      .toArray();

    res.send(result);
  } catch (error) {
    console.error("Fetch Bookings Error:", error);

    res.status(500).send({
      success: false,
      message: "Unable to fetch bookings.",
    });
  }
});

// ======================================
// CANCEL BOOKING
// ======================================

app.patch("/booking/:id/cancel", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid booking ID.",
      });
    }

    const result = await bookingCollection.updateOne(
      {
        _id: new ObjectId(id),
        status: "Pending",
      },
      {
        $set: {
          status: "Cancelled",
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(400).send({
        success: false,
        message: "Booking not found or booking is not Pending.",
      });
    }

    res.send({
      success: true,
      message: "Booking cancelled successfully.",
    });
  } catch (error) {
    console.error("Cancel Booking Error:", error);

    res.status(500).send({
      success: false,
      message: "Unable to cancel this booking.",
    });
  }
});

// ======================================
// MY STUDIO LISTINGS
// ======================================

app.get("/my-listings/:email", async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).send({
        success: false,
        message: "Email is required.",
      });
    }

    const result = await studioCollection
      .find({
        $or: [
          {
            "host.email": {
              $regex: `^${email}$`,
              $options: "i",
            },
          },
          {
            email: {
              $regex: `^${email}$`,
              $options: "i",
            },
          },
        ],
      })
      .toArray();

    res.status(200).send({
      success: true,
      studios: result,
    });
  } catch (error) {
    console.error("Fetch My Listings Error:", error);

    res.status(500).send({
      success: false,
      message: "Unable to fetch your listings.",
    });
  }
});

// ======================================
// SERVER STATUS
// ======================================

app.get("/", (req, res) => {
  res.send("Server is running at 5000");
});

// ======================================
// START SERVER
// ======================================

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
export default app;
