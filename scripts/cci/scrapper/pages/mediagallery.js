import { launchBrowser } from "../config/browser.js";
// import { getPdf } from "./helpers/pdfExtractor.js";
import { getPdfmediagallery } from "../helpers/getPdfmediagallery.js";
import cron from "node-cron";
// import connectToDB from "../db/models/mongo.js";
import logger from "../config/logger.js";

const scrapeAllPdfPages = async () => {
  const browser = await launchBrowser();
  const page = await browser.newPage();

  const baseURL = "https://www.cci.gov.in/media-gallery";
  const urlQueue = new Set(["https://www.cci.gov.in/media-gallery/press-release"]);
  const visitedUrls = new Set();

  // Extract PDFs from queued URLs
  while (urlQueue.size > 0) {
    const [currentUrl] = urlQueue;
    logger.info("visiting " + currentUrl);
    urlQueue.delete(currentUrl);
    if (!visitedUrls.has(currentUrl)) {
      visitedUrls.add(currentUrl);
      await getPdfmediagallery(
        currentUrl,
        page,
        urlQueue,
        visitedUrls,
        baseURL
      );
    }
  }

  // pdfDownload(newPDFLinks,visitedPdf);
  logger.info("PDF extraction completed.");
  await browser.close();
};
export default scrapeAllPdfPages;
