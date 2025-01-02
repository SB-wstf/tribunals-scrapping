import mongoose from "mongoose";

const pdfSchema = new mongoose.Schema(
  {
    title: String,
    pdfUrls: String,
    tagString: String,
    timestamp: { type: Date, default: Date.now },
  },
  {
    versionKey: false,
  }
);

const TDSAT = mongoose.model("TDSAT", pdfSchema);

export default TDSAT;
