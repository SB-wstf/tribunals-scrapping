import puppeteer from "puppeteer";
import fsPromises from "fs/promises";
import saveSingleToMongo from "./saveSingleToMongo.js";
import connectToMongoDB, { disconnectFromMongoDB } from "./connectToMongoAtlas.js";
const visitedUrls = "cestatVisitedPdfs.json";
const home = "Customs, Excise And Service Tax Appellate Tribunal";

export default async function notice() {
  const browser = await puppeteer.launch({
    headless: true,
  });
  const page = await browser.newPage();
  let visitedPdf;
  try {
    const fileContent = await fsPromises.readFile(visitedUrls, {
      encoding: "utf8",
    });
    const jsonArray = JSON.parse(fileContent);
    visitedPdf = new Set(jsonArray);
  } catch (error) {
    if (error.code === "ENOENT") visitedPdf = new Set([]);
    else console.log("Error reading the visitedPdf file:", error);
  }
  await connectToMongoDB();
  await getNoticesPdf("https://cestat.gov.in/noticestatus", page, visitedPdf);
  try {
    await fsPromises.writeFile(visitedUrls, JSON.stringify(Array.from(visitedPdf), null, 2), "utf-8");
  } catch (error) {
    console.error("Error saving the visitedPdf file:", error);
  }
  await disconnectFromMongoDB();
  await browser.close();
}

async function getNoticesPdf(url, page, visitedPdf) {
  await page.goto(url, { waitUntil: "networkidle2" });
  const cities = [
    "delhi",
    "mumbai",
    "chandigarh",
    "ahmedabad",
    "allahabad",
    "kolkata",
    "chennai",
    "bangalore",
    "hyderabad",
  ];
  const tabSelectors = [
    { name: "notice", selector: 'ul.nav.nav-tabs a[href="#tab-1"]' },
    { name: "circular/vacancy", selector: 'ul.nav.nav-tabs a[href="#tab-2"]' },
    { name: "render", selector: 'ul.nav.nav-tabs a[href="#tab-3"]' },
    { name: "rti", selector: 'ul.nav.nav-tabs a[href="#tab-4"]' },
  ];
  for (const city of cities) {
    await page.select("select#schemas", city);
    await page.waitForSelector("#responsetable", { visible: true });
    for (let i = 0; i < tabSelectors.length; i++) {
      await page.click(tabSelectors[i].selector);
      let hasNext = true;
      whileLoop: while (hasNext) {
        const rows = await page.evaluate(() => {
          const data = [];
          document.querySelectorAll("#responsetable tr").forEach((row) => {
            const secondTdText = row.querySelector("td:nth-child(2)")?.textContent.trim();
            const fourthTdHref = row.querySelector("td:nth-child(4) a")?.getAttribute("href");
            data.push({ secondTdText, fourthTdHref });
          });
          return data;
        });

        for (const row of rows) {
          const { secondTdText, fourthTdHref } = row;
          if (visitedPdf.has(fourthTdHref)) {
            hasNext = false;
            break whileLoop;
          }
          //push to db
          await saveSingleToMongo({
            title: secondTdText,
            pdfUrls: fourthTdHref,
            tagString: `${home} <-> ${city} <-> ${tabSelectors[i].name}`,
          });
          visitedPdf.add(fourthTdHref);
        }
        hasNext = await page.evaluate(() => {
          const nextButton = document.querySelector("#notice_next");
          if (!nextButton || nextButton.classList.contains("disabled")) {
            return false;
          }
          nextButton.querySelector("a").click();
          return true;
        });
        sleep(2000);
      }
    }
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
