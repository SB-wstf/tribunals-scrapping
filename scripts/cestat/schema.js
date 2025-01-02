// Define the schema
import { Schema, model } from "mongoose";

const schema = new Schema({
  title: {
    type: String,
    required: true,
  },
  pdfUrls: {
    type: String,
    required: true,
  },
  tagString: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Create a model from the schema
const Cestat = model("Cestat", schema);

export default Cestat;
