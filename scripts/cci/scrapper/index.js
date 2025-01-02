//index.js
import { launchBrowser } from "./config/browser.js";
import { getPdf } from "./helpers/pdfExtractor.js";
import { loadTrackedPdfs, saveToJSON } from "./helpers/fileOperations.js";
import cron from "node-cron";
import connectToDB from "../db/models/mongo.js";
import logger from "./config/logger.js";
import carriers from "./pages/carriers.js";
import antitrust from "./pages/antitrust.js";
import legalframwork from "./pages/legalframwork.js";
import combination from "./pages/combination.js";
import economicsresearch from "./pages/economicsresearch.js";
import advocacy from "./pages/advocacy.js";
import internationalcooperation from "./pages/internationalcooperation.js";
import capacitybuilding from "./pages/capacitybuilding.js";
import filing from "./pages/filing.js";
import events from "./pages/events.js";
import libraryservices from "./pages/libraryservices.js";
import mediagallery from "./pages/mediagallery.js";


const scrapeAllPdfPages = async () => {
  await carriers();
  await antitrust();
  await legalframwork();
  await combination();
  await economicsresearch();
  await advocacy();
  await internationalcooperation();
  await capacitybuilding();
  await filing();
  await events();
  await mediagallery();
  await libraryservices();
};

const startScraping = async () => {
  try {
    connectToDB();
    logger.info("Starting scraping...");
    await scrapeAllPdfPages();
    logger.info("Scraping completed.");
  } catch (error) {
    console.error("Error during scraping process:", error);
  }
};

// Schedule the scraping job to run at 12 AM every day
cron.schedule("0 0 * * *", async () => {
  console.log("Running scheduled daily scrape...");
  await startScraping();
});

// Initial scraping run
// (async () => {
//   console.log("Running initial scraping...");
//   await startScraping();
// })();



export const scrapeCCI = startScraping;
