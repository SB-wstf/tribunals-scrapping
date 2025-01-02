// fileOperation.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import logger from '../config/logger.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pdfTrackerFile = path.join(__dirname, "../../../../tempFiles/cci/json/cci.json");
let trackedPdfs = {};


export function loadTrackedPdfs(visitedPdf) {
  try {
      if (fs.existsSync(pdfTrackerFile)) {
          const data = fs.readFileSync(pdfTrackerFile, 'utf8');
          const trackedPdfs = JSON.parse(data); // Expecting an array of PDF objects
          console.log("Existing PDF data loaded.");

          // Loop through each tracked PDF object
          for (const pdf of trackedPdfs) {
              if (pdf.pdfUrl) {
                  visitedPdf.add(pdf.pdfUrl); // Add pdfUrl to the visited set
              }
          }
          console.log("Visited PDF URLs initialized from downloaded_pdfs.json.");
      } else {
          console.log("No existing PDF data found. Starting fresh.");
      }
  } catch (error) {
      console.error("Error loading tracked PDFs:", error);
  }
}

export const saveToJSON = (newPDFLinks) => {
  const filePath = path.resolve(__dirname, "../../../../tempFiles/cci/json/cci.json");

  try {
    // Ensure that the directory exists; if not, create it
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Initialize previousLinks as an empty array
    let previousLinks = [];

    // Load existing data if the file exists
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf8');

      // Check if the file is not empty before parsing
      if (fileData) {
        try {
          previousLinks = JSON.parse(fileData);  // Ensure the data is an array
          if (!Array.isArray(previousLinks)) {
            logger.warn("Expected an array in the JSON file, but got something else.");
            previousLinks = [];
          }
        } catch (parseError) {
          logger.error("Error parsing JSON data. The file might be corrupted. Resetting previousLinks to an empty array.", parseError);
          previousLinks = [];
        }
      }
    }

    // Ensure newPDFLinks is an array
    if (!Array.isArray(newPDFLinks)) {
      logger.error("newPDFLinks is not an array. Received: ", newPDFLinks);
    }

    // Merge new links with previous links, removing duplicates
    const mergedLinks = [
      ...previousLinks,
      ...newPDFLinks.filter(newLink => 
        !previousLinks.some(prevLink => prevLink.pdfUrl === newLink.pdfUrl)
      )
    ];
    console.log("mergedLinks: ", mergedLinks);
    
    // Write the merged data back to the JSON file
    fs.writeFileSync(filePath, JSON.stringify(mergedLinks, null, 2), 'utf8');
    logger.info("Successfully saved PDF links to JSON file.");
  } catch (error) {
    logger.error("Error saving PDF links to JSON:", error);
    throw error;  // Re-throw to allow centralized error management
  }
};
