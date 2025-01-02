import { connect } from "./connect.js";
import myData from "./model.js";
let continuousSamePdfCount = 0;

const uploadPdfFiles = async (jsonObject) => {
  try {
    await connect();

    const ep = await myData.findOne({ pdfUrls: jsonObject.pdfLink, title: jsonObject.title });
    if (ep) {
      console.log("Duplicate PDF Found with same title...", continuousSamePdfCount);
      continuousSamePdfCount++;
      if (continuousSamePdfCount > 3) {
        console.log("Duplicate PDF Found for max time...");
        return { status: "stop" };
      }
    } else {
      console.log("New PDF Found with different pdf Link and title...");
      continuousSamePdfCount = 0;
    }


    // Check if a PDF with the same URL already exists
    const existingDocument = await myData.findOne({
      pdfUrl: jsonObject.pdfLink,
    });

    if (existingDocument) {
      console.log("Duplicate PDF found, skipping:", jsonObject.pdfLink);
      return; // Skip saving duplicate PDF
    }


    const pdfDoc = new myData({
      tagString: jsonObject.tagString,
      title: jsonObject.title,
      pdfUrl: jsonObject.pdfLink,
      timestamp: new Date(),
    });

    await pdfDoc.save();
    console.log("Document saved successfully:", pdfDoc);
  } catch (err) {
    console.error("Failed to save document:", err.message);
  }
};

export default uploadPdfFiles;
