import mongoose from "mongoose";
import "dotenv/config";

// MongoDB connection setup
async function connectToDB() {
    try {
        await mongoose.connect(`${process.env.MONGO_DB_URI}`);
        console.log("Connected to MongoDB- ", process.env.MONGO_DB_URI);
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

export default connectToDB;
