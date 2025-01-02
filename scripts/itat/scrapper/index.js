import puppeteer from "puppeteer";
import fs from "fs";
import connectDB from "../db/index.db.js";
import Itat from "../db/itat.model.js";
import cron from "node-cron";

// List of URLs with their respective tagStrings
const pagesToVisit = [
  {
    url: "https://itat.gov.in/page/holiday_lists",
    tagString:
      "Income Tax Appellate Tribunal <-> General Information <-> Holiday Lists",
  },
  {
    url: "https://itat.gov.in/page/recruitment_news",
    tagString:
      "Income Tax Appellate Tribunal <-> General Information <-> Recruitment News",
  },
  {
    url: "https://itat.gov.in/page/employees_corner",
    tagString:
      "Income Tax Appellate Tribunal <-> General Information <-> Employees Corner",
  },
  {
    url: "https://itat.gov.in/page/official_language_news",
    tagString:
      "Income Tax Appellate Tribunal <-> General Information <-> Official Language Information",
  },
  {
    url: "https://itat.gov.in/page/tenders_auctions",
    tagString:
      "Income Tax Appellate Tribunal <-> General Information <-> Tenders and Auctions",
  },
  {
    url: "https://itat.gov.in/page/rti_orders_circulars",
    tagString:
      "Income Tax Appellate Tribunal <-> General Information <-> RTI Act, 2005 <-> RTI Orders and Circulars",
  },
  {
    url: "https://itat.gov.in/page/speeches",
    tagString: "Income Tax Appellate Tribunal <-> Media Gallery <-> Speeches",
  },
  {
    url: "https://itat.gov.in/page/press_releases",
    tagString:
      "Income Tax Appellate Tribunal <-> Media Gallery <-> Press Releases",
  },
  {
    url: "https://itat.gov.in/judicial/notice_board",
    tagString:
      "Income Tax Appellate Tribunal <-> Judicial Information <-> Notice Board",
  },
];

connectDB();

// Utility function to read JSON data from a file
const readJSON = (filePath) => {
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }
  return [];
};

// Utility function to save JSON data to a file
const saveJSON = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Load existing data and visited links
  const existingData = readJSON("pdf.json");
  const visitedLinks = new Set(readJSON("visited_links.json"));

  let pdfData = [];

  for (const { url, tagString } of pagesToVisit) {
    console.log(`Visiting: ${url}`);
    await page.goto(url, { waitUntil: "networkidle2" });

    let hasNextPage = true;

    while (hasNextPage) {
      // Wait for the table to load
      await page.waitForSelector("#printTable");

      // Scrape data from the current page
      const pageData = await page.evaluate((tagString) => {
        const rows = document.querySelectorAll("#printTable tbody tr");
        const data = [];

        rows.forEach((row) => {
          const description = row
            .querySelector("td:nth-child(1)")
            ?.innerText.trim();
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

      // Filter out already visited PDFs
      const newData = pageData.filter((item) => !visitedLinks.has(item.pdfURL));

      // Add new data to the list and update visited links
      pdfData = pdfData.concat(newData);
      newData.forEach((item) => visitedLinks.add(item.pdfURL));

      // Check if there is a next page button and navigate to the next page if available
      const nextButton = await page.$(".dt-paging .next:not(.disabled)");

      if (nextButton) {
        await nextButton.click();
        await page.waitForSelector("#printTable"); // Wait for the next page to load
      } else {
        hasNextPage = false;
      }
    }
  }

  // Combine new data with existing data and save to pdf.json
  const updatedData = [...existingData, ...pdfData];
  saveJSON("pdf.json", updatedData);

  // Save visited links to visited_links.json
  saveJSON("visited_links.json", Array.from(visitedLinks));

  console.log("PDF data has been updated in pdf.json");
  console.log("Visited links have been saved in visited_links.json");

  // Save the data to MongoDB using the Itat model
  for (const item of pdfData) {
    const newItat = new Itat({
      title: item.title,
      pdfUrl: item.pdfURL,
      tagString: item.tagString,
    });
    await newItat.save();
  }

  // // Save the data to MongoDB using the Itat model, but avoid duplicates
  // for (const item of pdfData) {
  //   // Check if a document with the same pdfUrl already exists in the database
  //   const existingDocument = await Itat.findOne({ pdfUrl: item.pdfURL });

  //   if (!existingDocument) {
  //     // If the document does not exist, create and save it
  //     const newItat = new Itat({
  //       title: item.title,
  //       pdfUrl: item.pdfURL,
  //       tagString: item.tagString,
  //     });

  //     await newItat.save();
  //     console.log(`Saved new document: ${item.title}`);
  //   } else {
  //     console.log(`Document already exists for PDF URL: ${item.pdfURL}`);
  //   }
  // }

  console.log("All new data has been saved to MongoDB without duplicates.");

  console.log("Data has been saved to MongoDB");

  await browser.close();
})();

// watcher function
cron.schedule(
  "0 * * * *",
  async () => {
    console.log("Running the script...");
    await scrapeData();
  },
  {
    scheduled: true,
    timezone: "Asia/Kolkata",
  }
);

console.log("Cron job scheduled to run every hour.");
