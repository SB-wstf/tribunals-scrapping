import puppeteer from "puppeteer";
import cron from "node-cron";
import uploadPdfFiles from "./database/controller.js"; // Import the uploadPdfFiles function

const Branch = [
  "/",
  "/introduction",
  "/act",
  "/rule",
  "/jurisdiction",
  "/benches",
  "/organisational-structure",
  "/present-member",
  "/officers",
  "/standing-counsel",
  "/rti",
  "/boards/committees",
  "/pio",
  "/disciplinary-action",
  "/rti-training",
  "/budgetary-allocation",
  "/tour-programme",
  "/policy/decisions",
  "/third-party-audit",
  "/suo-motu",
  "/calendar",
  "/case-status",
  "/cause-list",
  "/daily-order",
  "/oral-and-final-order",
  "/vacancies",
  "/calendar",
  "/forms",
  "/employee-corner",
  "/tour-programme",
  "/notices/circulars",
];

const branchLinks = [
  "https://cgat.gov.in/#",
  "https://cgat.gov.in/#/delhi",
  "https://cgat.gov.in/#/ahmedabad",
  "https://cgat.gov.in/#/allahabad",
  "https://cgat.gov.in/#/bangalore",
  "https://cgat.gov.in/#/chandigarh",
  "https://cgat.gov.in/#/chennai",
  "https://cgat.gov.in/#/cuttack",
  "https://cgat.gov.in/#/ernakulam",
  "https://cgat.gov.in/#/guwahati",
  "https://cgat.gov.in/#/hyderabad",
  "https://cgat.gov.in/#/jabalpur",
  "https://cgat.gov.in/#/jaipur",
  "https://cgat.gov.in/#/jammu",
  "https://cgat.gov.in/#/jodhpur",
  "https://cgat.gov.in/#/kolkata",
  "https://cgat.gov.in/#/lucknow",
  "https://cgat.gov.in/#/lucknow",
  "https://cgat.gov.in/#/mumbai",
  "https://cgat.gov.in/#/srinagar",
  "https://cgat.gov.in/#/patna",
];

const startBrowser = async () => {
  try {
    console.log("Opening the browser...");
    return await puppeteer.launch({
      product: "chrome",
      channel: "chrome",
      headless: false,
      args: ["--disable-setuid-sandbox"],
      ignoreHTTPSErrors: true,
    });
  } catch (err) {
    console.error("Could not create a browser instance => : ", err);
    throw err;
  }
};

// Extract data from the breadcrumb and rows on the page
const extractDataFromPage = async (page) => {
  try {
    console.log("Extracting data from page...");

    // Wait for the table rows to appear
    await page.waitForSelector("tr"); // Wait for rows to load

    const data = await page.evaluate(() => {
      const rows = document.querySelectorAll("tr");
      const result = [];

      // Extract breadcrumb string
      const breadcrumbItems = [];
      const breadcrumbs = document.querySelectorAll(".breadcrumb .breadcrumb-item");
      breadcrumbs.forEach((item) => {
        // Get the text content of the breadcrumb items
        const breadcrumbText = item.innerText.trim();
        if (breadcrumbText) {
          breadcrumbItems.push(breadcrumbText);
        }
      });

      breadcrumbItems[0] = "CENTRAL ADMINISTRATIVE TRIBUNAL";
      console.log(breadcrumbItems);

      // Format breadcrumb as "a<->b<->c"
      const tagString = breadcrumbItems.join(" <-> ");

      // Loop through each row and extract the relevant information
      rows.forEach((row) => {
        const titleElement = row.querySelector('td[headers="view-details-table-column"]');
        const pdfLinkElement = row.querySelector('td[headers="view-file-table-column"] a');

        if (titleElement && pdfLinkElement) {
          const title = titleElement.textContent.trim();
          const pdfLink = pdfLinkElement.href;

          result.push({ tagString, title, pdfLink });
        }
      });

      return result;
    });

    console.log("Data extracted:", data);
    return data;
  } catch (err) {
    console.error("Error extracting data:", err);
    return [];
  }
};

// Scraping the data from all the pages
const scrapeAll = async () => {
  let browser;
  try {
    browser = await startBrowser();
    const page = await browser.newPage();

    // Loop through all branch links
    for (let url of branchLinks) {
      for (let nav of Branch) {
        const navigationlinks = url + nav;

        try {
          console.log(`Visiting branch: ${navigationlinks}...`);
          await page.goto(navigationlinks, {
            waitUntil: "networkidle2", // Wait until network is idle (can be adjusted)
            timeout: 30000,
          });

          // Wait for the component to load (in this case, the table rows)
          await page.waitForSelector("tr", { timeout: 30000 });

          // Step 2: Extract data (titles and PDF links)
          const data = await extractDataFromPage(page);
          if (data.length > 0) {
            console.log(`Data from ${navigationlinks}:`, data);

            // Insert each data item into MongoDB
            for (const item of data) {
              const res = await uploadPdfFiles(item); // Call the uploadPdfFiles function for each data item
              if (res.status === "stop") {
                console.log(
                  "stoppring scrapping bcoz same data found continuously ****************"
                );
                await browser.close();
                return { status: "stop" };
              }
            }
          }
        } catch (error) {
          console.error(`Error visiting ${navigationlinks}:`, error.message);
        }
      }
    }
  } catch (err) {
    console.error("Error during scraping:", err);
  } finally {
    if (browser) {
      console.log("Closing the browser...");
      await browser.close();
    }
  }
};

// Run scraping immediately
(async () => {
  try {
    await scrapeAll();
  } catch (err) {
    console.error("Error found during initial scraping:", err);
  }
})();

// // Schedule scraping as a cron job
// cron.schedule("0 0 * * *", async () => {
//   try {
//     console.log("Starting scheduled task...");
//     await scrapeAll();
//     console.log("Scheduled task completed successfully.");
//   } catch (err) {
//     console.error(`Error occurred during scheduled task: ${err}`);
//   }
// });

export const scrapeCGAT = scrapeAll;
