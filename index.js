import 'dotenv/config'
import cors from "cors"
import express from "express";
import { MongoClient, ObjectId } from 'mongodb';
const app = express();
const port = 5000;

app.use(cors())
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
const db = mongoClient.db("studio")
const studioCollection = db.collection("studio")

app.post('/add-studio', async(req, res) =>{
  const data = req.body
  const result =await studioCollection.insertOne(data)
console.log(result);
  res.send({result})
})

http://localhost:5000/studios

app.get('/', (req, res) => {
  res.send('Server is running at 5000');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});