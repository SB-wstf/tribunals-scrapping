import puppeteer from "puppeteer";
import connectDB from "../db/index.db.js";
import Itat from "../db/itat.model.js";
// import cron from "node-cron";

// Array of pages to visit and scrape data from
const pagesToVisit = [
  {
    url: "https://itat.gov.in/page/holiday_lists",
    tagString: "Income Tax Appellate Tribunal <-> General Information <-> Holiday Lists",
  },
  {
    url: "https://itat.gov.in/page/recruitment_news",
    tagString: "Income Tax Appellate Tribunal <-> General Information <-> Recruitment News",
  },
  {
    url: "https://itat.gov.in/page/employees_corner",
    tagString: "Income Tax Appellate Tribunal <-> General Information <-> Employees Corner",
  },
  {
    url: "https://itat.gov.in/page/official_language_news",
    tagString: "Income Tax Appellate Tribunal <-> General Information <-> Official Language Information",
  },
  {
    url: "https://itat.gov.in/page/tenders_auctions",
    tagString: "Income Tax Appellate Tribunal <-> General Information <-> Tenders and Auctions",
  },
  {
    url: "https://itat.gov.in/page/rti_orders_circulars",
    tagString: "Income Tax Appellate Tribunal <-> General Information <-> RTI Act, 2005 <-> RTI Orders and Circulars",
  },
  {
    url: "https://itat.gov.in/page/speeches",
    tagString: "Income Tax Appellate Tribunal <-> Media Gallery <-> Speeches",
  },
  {
    url: "https://itat.gov.in/page/press_releases",
    tagString: "Income Tax Appellate Tribunal <-> Media Gallery <-> Press Releases",
  },
  {
    url: "https://itat.gov.in/judicial/notice_board",
    tagString: "Income Tax Appellate Tribunal <-> Judicial Information <-> Notice Board",
  },
];

// Connect to the database
connectDB();







// Function to scrape data from the pages
const scrapeData = async () => {
    console.log("RUNNING ITAT SCRAPER");
    return
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
  
  
    for (const { url, tagString } of pagesToVisit) {
      console.log(`Visiting: ${url}`);
      await page.goto(url, { waitUntil: "networkidle2" });
  
      let hasNextPage = true;
  
      while (hasNextPage) {
        await page.waitForSelector("#printTable");
  
        // Scrape data from the current page
        const pageData = await page.evaluate((tagString) => {
          const rows = document.querySelectorAll("#printTable tbody tr");
          const data = [];
  
          rows.forEach((row) => {
            const description = row.querySelector("td:nth-child(1)")?.innerText.trim();
            const pdfURL = row.querySelector("td:nth-child(2) a")?.href;
  
            if (description && pdfURL) {
              data.push({
                title: description,
                pdfURL: pdfURL,
                tagString: tagString,
              });
            }
          });
  
          return data;
        }, tagString);
  
     
  
        // Variable to track consecutive duplicate documents
        let duplicateCount = 0;
  
        // Save each new item to the database
        for (const item of pageData) {
          try {
            const existingDoc = await Itat.findOne({ pdfUrl: item.pdfURL });
  
            if (existingDoc) {
              console.log(`Duplicate found for: ${item.title}`);
              duplicateCount++;
            } else {
              // If it's a new document, save it to the database
              const newItat = new Itat({
                title: item.title,
                pdfUrl: item.pdfURL,
                tagString: item.tagString,
              });
              await newItat.save();
              console.log(`Saved to DB: ${item.title}`);
            }
  
            // If five consecutive duplicates are found, stop scraping
            if (duplicateCount >= 5) {
              console.log("Five consecutive duplicate documents found. Stopping scraping for this page.");
              hasNextPage = false;
              break;
            }
          } catch (error) {
            console.error(`Error saving to DB: ${error.message}`);
          }
        }
  
        // Check if there is a next page button and navigate to the next page if available
        const nextButton = await page.$(".dt-paging .next:not(.disabled)");
        if (nextButton) {
          await nextButton.click();
          await page.waitForSelector("#printTable");
        } else {
          hasNextPage = false;
        }
      }
    }
  
    console.log("Scraping complete.");
    await browser.close();
  };

export const scrapeITAT = scrapeData();

// Cron job to run the scraping every 10 minutes
// cron.schedule(
//   "*/10 * * * *",
//   async () => {
//     console.log("Running the script...");
//     await scrapeData();
//   },
//   {
//     scheduled: true,
//     timezone: "Asia/Kolkata",
//   }
// );

// console.log("Cron job scheduled to run every 10 minutes.");
