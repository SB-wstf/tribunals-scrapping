import mongoose from "mongoose";

const itatSchema = new mongoose.Schema(
  {
    title: {
      type: String,
    },
    pdfUrl: {
      type: String,
    },
    tagString: {
      type: String,
    },
    timeStamp: {
      type: Date,
      default: Date.now,
    },
  }
  //   { timestamps: true }
);

const Itat = mongoose.model("Itat", itatSchema);

export default Itat;
