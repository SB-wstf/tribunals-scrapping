import mongoose from "mongoose";

const pdfSchema = new mongoose.Schema(
  {
    title: String,
    pdfUrls: String,
    tagString: String,
    pageUrl: String,
    timestamp: { type: Date, default: Date.now },
  },
  {
    versionKey: false,
  }
);

const NCLAT = mongoose.model("NCLAT", pdfSchema);

export default NCLAT;
