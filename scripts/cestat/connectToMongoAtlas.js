import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
export default async function connectToMongoDB() {
  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB Atlas");
  } catch (error) {
    console.error("Error connecting to MongoDB Atlas:", error);
  }
}

export async function disconnectFromMongoDB() {
  try {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB Atlas");
  } catch (error) {
    console.error("Error disconnecting from MongoDB Atlas:", error);
  }
}
