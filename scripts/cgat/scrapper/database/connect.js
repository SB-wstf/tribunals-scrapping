import mongoose from "mongoose";
// import dotenv from "dotenv";

// dotenv.config();

const connect = async () => {
  try {
    mongoose.connect(
      "mongodb+srv://deepakkumar:M92xjniipmDT8rtK@cluster0.z2d9d.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
    );

    console.log("database connected");

    return true;
  } catch (err) {
    console.log("databse has connected", err);
    return false;
  }
};

export { connect };
