import cron from "node-cron";
import { functionMap } from "./scrapingFunctions.js";
import { PythonShell } from "python-shell";
import { pythonFiles } from "./pythonFiles.js";

const file = "./scripts/rbi/test.py";
const scrapperJs = async () => {
  // Loop through the functionMap and execute each scraping function
  for (const [key, functionToRun] of Object.entries(functionMap)) {
    try {
      console.log(`Starting scrape for ${key}`);
      await functionToRun();
      console.log(`Successfully scraped ${key}`);
    } catch (error) {
      console.error(`Error scraping ${key}:`, error);
    }
  }
};

const scrapperPython = async () => {
  console.log("Running python files", pythonFiles);
  // Loop through each Python file in the pythonFiles array
  for (let i = 0; i < pythonFiles.length; i++) {
    try {
      console.log(`Starting scrape for ${pythonFiles[i]} ************`);

      const res = await PythonShell.run(pythonFiles[i], null);

      console.log(`Successfully ran ${pythonFiles[i]}: `, res);
    } catch (error) {
      console.error(`Error running ${pythonFiles[i]}:`, error);
    }
  }
};

// Schedule the scraping job to run at 12 AM every day
cron.schedule("0 0 * * *", async () => {
  console.log("Running scheduled daily scrape...");
  await scrapperJs();
  await scrapperPython();
});

// Initial scraping run
const scrapper = async () => {
  await scrapperJs();
  await scrapperPython();
};

// scrapper();

scrapperPython();