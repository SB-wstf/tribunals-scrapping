import { launchBrowser } from "./config/browserConfig.js";
import { getPdf } from "./services/pdfExtractor.js";
import cron from "node-cron";
import connectToDB from "./config/mongoConfig.js";

const scrapeAllPdfPages = async () => {
  const visitedPdf = new Set();
  const allPdf = [];
  const trackedPdfs = {};

  const browser = await launchBrowser();
  const page = await browser.newPage();

  const urlQueue = new Set(["https://nclat.nic.in/"]);
  const visitedUrls = new Set();

  // Extract PDFs from queued URLs
  while (urlQueue.size > 0) {
    const [currentUrl] = urlQueue;
    urlQueue.delete(currentUrl);
    if (!visitedUrls.has(currentUrl)) {
      visitedUrls.add(currentUrl);
      const res = await getPdf(currentUrl, page, urlQueue, visitedPdf, allPdf);
      if (res.status === "stop") {
        console.log("Scraping stopped ***&&&***~~~~~~~~~~~~.");
        await browser.close();
        return;
      }
    }
  }

  console.log("PDF extraction completed.");
  await browser.close();
};

const startScraping = async () => {
  try {
    connectToDB();
    console.log("Starting scraping...");
    await scrapeAllPdfPages();
    console.log("Scraping completed.");
  } catch (error) {
    console.error("Error during scraping process:", error);
  }
};

// Schedule the scraping job to run at 12 AM every day
// cron.schedule("0 0 * * *", async () => {
//   console.log("Running scheduled daily scrape...");
//   await startScraping();
// });

// Initial scraping run
// (async () => {
//   console.log("Running initial scraping...");
//   await startScraping();
// })();

export const scrapeNCLAT = startScraping;
