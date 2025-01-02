import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    tagString: { type: String, required: true },
    title: { type: String, required: true },
    pdfUrl: { type: String, required: true },
    timestamp: { type: Date, required: true },
  },
  { versionKey: false }
);

const myData = mongoose.model("cgat", documentSchema);

export default myData;
