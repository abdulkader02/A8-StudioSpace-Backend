import "dotenv/config";
import cors from "cors";
import express from "express";
import { MongoClient, ObjectId } from "mongodb";
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
    console.dir(err);
  }
}
const mongoClient = await connectToMongoDB();
const db = mongoClient.db("studio");
const studioCollection = db.collection("studio");
const bookingCollection = db.collection("bookings");

app.post("/add-studio", async (req, res) => {
  const data = req.body;
  const result = await studioCollection.insertOne(data);
  console.log(result);
  res.send({ result });
});

app.get("/studios", async (req, res) => {
  const result = await studioCollection.find().toArray();
  res.send(result);
});

app.get("/studio/:id", async (req, res) => {
  const { id } = req.params;
  const result = await studioCollection.findOne({ _id: new ObjectId(id) });
  res.send(result);
});

app.patch("/studio/:id", async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;
  const result = await studioCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updatedData },
  );
  res.json(result);
});

app.delete("/studio/:id", async (req, res) => {
  const { id } = req.params;
  const result = await studioCollection.deleteOne({ _id: new ObjectId(id) });
  res.json(result);
});

app.post("/booking", async (req, res) => {
  try {
    const data = req.body;

    const bookingData = {
      ...data,
      status: "Pending",
    };

    const result = await bookingCollection.insertOne(bookingData);

    res.status(201).send({
      success: true,
      message: "Booking created successfully.",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error("Create Booking Error:", error);

    res.status(500).send({
      success: false,
      message: "Unable to create booking.",
    });
  }
});



app.get("/my-bookings/:email", async (req, res) => {
  const { email } = req.params;
  const result = await bookingCollection
    .find({ "user.email": email })
    .toArray();
  res.send(result);
});

// http://localhost:5000/my-bookings


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
      }
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


// http://localhost:5000/booking/:id/cancel

app.get("/", (req, res) => {
  res.send("Server is running at 5000");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
