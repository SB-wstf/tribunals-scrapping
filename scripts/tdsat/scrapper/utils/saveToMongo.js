import TDSAT from "../models/schema.js";
let continuousSamePdfCount = 0;

const createIfNotExists = async (data) => {
  try {
    const DBModel = TDSAT;
    // console.log("save- ", data);

    const ep = await DBModel.findOne({ pdfUrls: data.pdfUrls, title: data.title });
    if (ep) {
      console.log("Duplicate PDF Found with same title...", continuousSamePdfCount);
      continuousSamePdfCount++;
      if (continuousSamePdfCount > 5) {
        console.log("Duplicate PDF Found for max time...");
        return { status: "stop" };
      }
    } else {
      console.log("New PDF Found with different pdf Link and title...");
      continuousSamePdfCount = 0;
    }

    // Check if a document with the same title already exists
    const existingDocument = await DBModel.findOne({ pdfUrls: data.pdfUrls });

    if (existingDocument) {
      // console.log("Document already exists:", existingDocument);
      return existingDocument; // Return the existing document
    }

    // Regular expression to match titles with format: "my title" or "my title (1)", "my title (2)", etc.
    const titlePattern = new RegExp(`^${data.title}( \\(\\d+\\))?$`);

    // Find documents with matching title patterns
    const existingDocumentsWithSimilarTitles = await DBModel.find({
      title: { $regex: titlePattern },
    });

    // If there are matching titles, determine the highest suffix number to generate the next unique title
    if (existingDocumentsWithSimilarTitles.length > 0) {
      data.title = `${data.title} (${existingDocumentsWithSimilarTitles.length})`;
    }

    // Function to remove specific unwanted special characters from the start of a string
    function removeLeadingSpecialChars(input) {
      // Define a regex that matches unwanted special characters or spaces at the start of the string
      const unwantedCharsPattern = /^[-!"#$%&'()*+,/:;<=>?@[\\\]_^`{|}~\s]+/u; // List of unwanted special characters + spaces

      // Keep removing unwanted characters from the start until valid text is found
      return input.replace(unwantedCharsPattern, "").trim();
    }

    data.title = removeLeadingSpecialChars(data.title);
    data.title = data.title.trim();

    delete data.pageUrl; // Removes the 'pageUrl' key from the data object

    // If it doesn't exist, create a new document
    const newDocument = new DBModel(data);
    const savedDocument = await newDocument.save();
    // if (existingDocumentwithSameTitle) console.log("Document created:", savedDocument.title);
    return savedDocument;
  } catch (error) {
    console.error("Error in createIfNotExists:", error);
  }
};

export default createIfNotExists;
