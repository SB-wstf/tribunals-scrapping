import "dotenv/config";
import mongoose from "mongoose";

const connectDB = async () => {
  try {
    // const connectionInstance = await mongoose.connect(
    //   `${process.env.MONGO_DB_URI}`
    // );
    const connectionInstance = await mongoose.connect(process.env.MONGO_DB_URI);
    console.log(
      `MONGO DB CONNECTECD !! : ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.log(`MONGO DB CONNECTION ERROR : ${error}`);
    process.exit(1);
  }
};

export default connectDB;
// connectDB();