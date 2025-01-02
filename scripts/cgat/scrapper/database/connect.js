import mongoose from "mongoose";
// import dotenv from "dotenv";

// dotenv.config();

const connect = async () => {
  try {
    mongoose.connect(process.env.MONGO_DB_URI);

    console.log("database connected");

    return true;
  } catch (err) {
    console.log("databse has connected", err);
    return false;
  }
};

export { connect };
