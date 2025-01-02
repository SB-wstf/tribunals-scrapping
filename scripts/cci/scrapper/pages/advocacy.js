import { launchBrowser } from "../config/browser.js";
// import { getPdf } from "./helpers/pdfExtractor.js";
import { getPdfAdvocacy } from "../helpers/getPdfAdvocacy.js";
import cron from "node-cron";
// import connectToDB from "../db/models/mongo.js";
import logger from "../config/logger.js";

const scrapeAllPdfPages = async () => {
  const browser = await launchBrowser();
  const page = await browser.newPage();

  const baseURL = "https://www.cci.gov.in/advocacy";
  const urlQueue = new Set(["https://www.cci.gov.in/advocacy/events"]);
  const visitedUrls = new Set();

  // Extract PDFs from queued URLs
  while (urlQueue.size > 0) {
    const [currentUrl] = urlQueue;
    logger.info("visiting " + currentUrl);
    urlQueue.delete(currentUrl);
    if (!visitedUrls.has(currentUrl)) {
      visitedUrls.add(currentUrl);
      await getPdfAdvocacy(
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
