import mongoose from "mongoose";

const pdfSchema = new mongoose.Schema({
    title: String,
    pdfUrls: String,
    tagString: String,
    timestamp: { type: Date, default: Date.now },
});

const Cci = mongoose.model("Cci", pdfSchema);

export default Cci;
