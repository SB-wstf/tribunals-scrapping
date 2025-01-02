import puppeteer from "puppeteer";
import fsPromises from "fs/promises";
import connectToMongo, { disconnectFromMongoDB } from "./connectToMongoAtlas.js";
import saveSingleToMongo from "./saveSingleToMongo.js";
const baseUrl = "https://cestat.gov.in/";
const visitedUrls = "cestatVisitedPdfs.json";
const home = "Customs, Excise And Service Tax Appellate Tribunal";
const breadcrumbSelector = "div.b-title h4";
const unwantedFileExtensions = new Set([
  "jpg",
  "jpeg",
  "docx",
  "gif",
  "heif",
  "heic",
  "png",
  "svg",
  "doc",
  "ppt",
  "pptx",
  "txt",
  "xls",
  "xlsx",
  "mp3",
  "mp4",
  "jar",
  "rar",
  "zip",
  "exe",
]);

export default async function init() {
  const browser = await puppeteer.launch({
    headless: true,
  });
  const page = await browser.newPage();
  let visitedPdfs;

  try {
    const fileContent = await fsPromises.readFile(visitedUrls, "utf-8");
    const jsonArray = JSON.parse(fileContent);
    visitedPdfs = new Set(jsonArray);
  } catch (error) {
    visitedPdfs = new Set([]);
  }
  await connectToMongo();
  const uniqueUrls = new Set([baseUrl]);
  for (const currentUrl of uniqueUrls) {
    await getPdf(currentUrl, page, visitedPdfs, uniqueUrls);
  }
  try {
    await fsPromises.writeFile(visitedUrls, JSON.stringify(Array.from(visitedPdfs), null, 2), "utf-8");
  } catch (error) {
    console.error(`Error saving the ${visitedUrls} file:`, error);
  }
  await disconnectFromMongoDB();
  await browser.close();
}

const getPdf = async (url, page, visitedPdfs, uniqueUrls) => {
  if (url.endsWith(".pdf")) return;
  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    await page.waitForSelector("a");

    const allAnchors = await page.$$("a");

    for (const anchor of allAnchors) {
      let href = await anchor.evaluate((el) => el.href?.trim()?.toLowerCase());
      if (!href) continue;

      // if (!href.startsWith("https://")) {
      //   href = baseUrl + href.substring(1);
      // }
      if (!visitedPdfs.has(href)) {
        if (href.endsWith(".pdf")) {
          try {
            let title = await extractTitle(anchor);
            let tagString = await extractBreadcrumb(page);
            if (title && href && tagString) {
              await saveSingleToMongo({ title, pdfUrls: href, tagString });
              visitedPdfs.add(href);
            }
          } catch (error) {
            console.error("Error extracting PDF details:", error);
          }
        } else if (shouldAddToUniqueUrls(href)) {
          uniqueUrls.add(href);
        }
      }
    }
  } catch (error) {
    console.error("Error processing URL:", url, error);
  }
};

async function extractTitle(anchor) {
  try {
    let title = await anchor.evaluate((el) => el.innerText.trim().toLowerCase());
    if (title.includes("download") || title.includes("view") || title.includes("directory")) {
      const newTitle = await anchor.evaluate((el) => {
        const closestTr = el.closest("tr");
        if (!closestTr) return null;
        const secondTd = closestTr.querySelectorAll("td")[1];
        return secondTd?.innerText?.trim() || null; // Return the text or null if not found
      });
      if (newTitle) {
        title = newTitle;
      }
    }
    return title;
  } catch (error) {
    throw new Error("Error extracting title: " + error.message);
  }
}

async function extractBreadcrumb(page) {
  try {
    let breadcrumb = await page.$eval(breadcrumbSelector, (el) => el.innerText.trim());
    breadcrumb
      .split("/")
      .map((s) => s.trim())
      .join(" <-> ");
    return `${home} <-> ${breadcrumb}`;
  } catch (error) {
    throw new Error("Error extracting breadcrumb: " + error.message);
  }
}

function shouldAddToUniqueUrls(href) {
  return (
    href !== "https://cestat.gov.in/noticestatus" &&
    !href.includes("form") &&
    href.startsWith(baseUrl) &&
    !unwantedFileExtensions.has(getFileExtensionFromEnd(href))
  );
}

function getFileExtensionFromEnd(url) {
  const lastDotIndex = url.lastIndexOf(".");
  if (lastDotIndex === -1) return "";
  const extension = url.slice(lastDotIndex + 1).toLowerCase();
  return extension.includes("/") ? "" : extension;
}
