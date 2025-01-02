// pdfHandler.js

import fs from "fs";
import path from "path";
import axios from "axios";
import logger from "../config/logger.js";
import Cci from "../../db/models/model.js";

// Save PDF link function
export const savetoMongo = async (pdfLink) => {
  try {
    // Check if the PDF link already exists in the database
    const existingPDF = await Cci.findOne({ pdfUrls: pdfLink.pdfUrls });
    if (existingPDF) {
      logger.info(`PDF link already exists: ${pdfLink.pdfUrls}`);
      return true;
    }

    // Save the new PDF link
    const newPDFLink = new Cci({
      pdfUrls: pdfLink.pdfUrls,
      tagString: pdfLink.tagString,
      title: pdfLink.title,
    });

    await newPDFLink.save();

    logger.info(`PDF link saved successfully: ${pdfLink.pdfUrls}`);
    return false;
  } catch (error) {
    logger.error(`Error saving PDF link: ${error.message}`);
  }
};

export const addToNewPDFLinks = (pdfLink, newPDFLinks) => {
  // Add the new PDF link to newPDFLinks
  newPDFLinks.push(pdfLink);
  logger.info(`Added new PDF link: ${pdfLink.pdfUrls}`);
};

export const pdfDownload = async (newPDFLinks, visitedPdf) => {
  const downloadFolder = path.resolve(__dirname, "downloads");

  // Ensure the download folder exists
  if (!fs.existsSync(downloadFolder)) {
    fs.mkdirSync(downloadFolder, { recursive: true });
  }

  for (const pdfLink of newPDFLinks) {
    const { pdfUrls, title } = pdfLink;

    // Check if the PDF has already been visited
    if (!visitedPdf.has(pdfUrls)) {
      try {
        logger.info(`Downloading PDF: ${title || pdfUrls}`);

        // Get the PDF file name (from URL or create a safe file name)
        const fileName = title
          ? `${title.replace(/[\/\\?%*:|"<>]/g, "-")}.pdf`
          : path.basename(pdfUrls);
        const filePath = path.resolve(downloadFolder, fileName);

        // Download the PDF file using axios
        const response = await axios({
          method: "GET",
          url: pdfUrls,
          responseType: "stream",
        });

        // Write the PDF to the download folder
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        // Return a promise to ensure the download is complete before moving on
        await new Promise((resolve, reject) => {
          writer.on("finish", resolve);
          writer.on("error", reject);
        });

        logger.info(`PDF saved: ${filePath}`);

        // Mark this PDF as visited
        visitedPdf.add(pdfUrls);
      } catch (error) {
        logger.error(`Failed to download PDF (${pdfUrls}): ${error.message}`);
      }
    } else {
      logger.info(`PDF already visited: ${pdfUrls}`);
    }
  }
};
