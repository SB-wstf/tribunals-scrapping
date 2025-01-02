// const puppeteer = require("puppeteer");
import puppeteer from "puppeteer";
import { savetoMongo } from "../helpers/pdfHandler.js";
import logger from "../config/logger.js";

// Define a delay function

function delay(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

export default async function scrapePDFLinks() {
  const baseURL = "https://www.cci.gov.in/career";
  const pdfSelector = '.marginBottom.floatLeft.col-sm-9 a[href$=".pdf"]';
  const nextButtonSelector = "#datatable_ajax_next";
  let continuousExistsCount = 0; // Counter for continuous existing links

  const links = [];

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Set a higher timeout for the page
    await page.goto(baseURL, { waitUntil: "networkidle2", timeout: 60000 });

    let hasNextPage = true;
    let count = 0;
    while (hasNextPage) {
      try {
        count++;
        await delay(1000);
        // Wait for the PDF links to load
        await page.waitForSelector(pdfSelector, { timeout: 60000 });

        const allAnchorData = await page.evaluate(() => {
          const pdfSelector =
            '.marginBottom.floatLeft.col-sm-9 a[href$=".pdf"]';
          const anchors = Array.from(document.querySelectorAll(pdfSelector));

          // Function to capitalize words in the title
          const capitalize = (str) => {
            return str
              .toLowerCase()
              .split(" ")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ");
          };

          // // Function to clean up the title
          // const cleanTitle = (title) => {
          //   return title
          //     .replace(/\(.*?\s*MB|KB\)/gi, "") // Remove size info like "(150 KB)"
          //     .replace(/_/g, " ")
          //     .replace(/-/g, " ")
          //     .replace(".pdf", "")
          //     .replace("Click Here For Download", "")
          //     .replace("Click here", "")
          //     .trim();
          // };
          const cleanTitle = (title) => {
            return title
              .replace(/-/g, " ")
              .replace(/_/g, " ")
              .replace("compressed", " ")
              .replace("ilovepdf", " ")
              .replace(".pdf", "")
              .replace("Click Here For Download", "")
              .replace("Click here", "")
              .replace(/\bsize:\s*\(\s*\d+(\.\d+)?\s*(kb|mb)\s*\)/gi, "") // Remove patterns like "Size:( 2 MB)" or "Size:( 2.5 KB)"
              .replace(/\b--+\s*size:\s*\(\s*file in kb\s*\)/i, "") // Remove variations like "-- Size:( File In Kb)"
              .replace(/\s*size:\s*\(\s*file in kb\s*\)$/i, "") // Remove "Size:( File In Kb)" at the end of the title
              .replace(/\(.*?\s*MB|KB\)/gi, "") // Remove size info like "(150 KB)"
              .replace(/\(/g, " ") // Replace opening parentheses with spaces
              .replace(/\)/g, " ") // Replace closing parentheses with spaces
              .replace(/-+\s*-+/g, " ") // Remove patterns like "- -", "- - -", "--", "- --"
              .replace(/["“”']/g, "") // Remove all double quotes (straight and curly)
              .replace(/&nbnbsp;/gi, "") // Remove occurrences of "&nbnbsp"
              .replace(/\s+/g, " ") // Replace multiple spaces with a single space
              .trim();
          };

          // Extract PDF URL from onclick
          const extractPdfFromOnClick = (onclick) => {
            const match = onclick?.match(/viewPdf\(['"](.+?)['"]\)/);
            return match ? match[1] : null;
          };

          return anchors.map((anchor) => {
            let href = anchor.href.trim();
            let title = anchor.innerText.trim() || null;
            title = title && cleanTitle(capitalize(title));

            // Handle cases where href is javascript:void(0) and extract PDF link from onclick
            if (href === "javascript:void(0)") {
              const pdfLink = extractPdfFromOnClick(
                anchor.getAttribute("onclick")
              );
              if (pdfLink) href = pdfLink; // Update href with extracted PDF link
            }

            // Ensure the title does not start with "Download" or "View"
            let isNum = Number(title);
            if (
              !title ||
              title.length <= 5 ||
              !isNaN(isNum) ||
              title.toLowerCase().startsWith("download") ||
              title.toLowerCase().startsWith("- download") ||
              title.toLowerCase().startsWith("view") ||
              title.toLowerCase().startsWith("scan") ||
              title.toLowerCase().startsWith("Https://www.cci.gov.in/")
            ) {
              let filename = href.split("/").pop().replace(".pdf", "");
              title = decodeURIComponent(filename); // Decode URL-encoded characters
            }
            // console.log("title: ", title);
            title = cleanTitle(capitalize(title));

            // Check if the anchor is inside a table row
            isNum = Number(title);
            const row = anchor.closest("tr");
            if ((!title || title.length <= 5 || !isNaN(isNum)) && row) {
              const precedingTDs = Array.from(row.querySelectorAll("td")).slice(
                0,
                -1
              ); // Exclude the last <td> containing the anchor
              title = precedingTDs.map((td) => td.innerText.trim()).join(" - ");
              title = cleanTitle(capitalize(title));
            }

            return {
              href: href, // Final href
              title: title, // Final title after cleanup
            };
          });
        });

        console.log("allAnchorData", allAnchorData);

        for (const anchorData of allAnchorData) {
          const { href, title } = anchorData;

          logger.info("found pdf " + href);

          let tagString = await page.evaluate(() => {
            try {
              const breadCrumb = document.querySelector(".breadcrumb");
              if (breadCrumb) {
                const breadcrumbItems = Array.from(
                  breadCrumb.querySelectorAll("a")
                ).map((item) => {
                  const text = item.innerText.trim();
                  // item.innerText.trim();
                  return text === "Home"
                    ? "Competition Commission of India"
                    : text;
                });
                // Join breadcrumb items with "<->"
                let tagString = breadcrumbItems.join(" <-> ");

                // Replace any instances of " / " with "<->"
                return tagString.replace(/\s*\/\s*/g, " <-> ");
              }
            } catch (error) {
              console.error("Error extracting breadcrumb:", error);
            }
            return "";
          });
          // Check if tagString is empty, and update it if necessary
          tagString = tagString || "Competition Commission of India";

          const pdfLink = {
            tagString,
            title,
            pdfUrls: href,
          };

          const alreadyExists = await savetoMongo(pdfLink);
          logger.info(` alreadyExists: ${alreadyExists}`);

          if (alreadyExists) {
            continuousExistsCount++;
            if (continuousExistsCount >= 5) {
              console.log(
                "Encountered 5 continuous existing PDF links. Exiting carriers function."
              );
              return; // Exit the carriers function
            }
          } else {
            continuousExistsCount = 0; // Reset the counter on a successful insert
          }

          links.push(pdfLink);
        }

        // Check if the "Next" button exists and is enabled
        const nextButton = await page.$(nextButtonSelector);

        if (nextButton) {
          // Check if the "Next" button is disabled by looking for the "disabled" class
          const isDisabled = await page.$eval(nextButtonSelector, (button) =>
            button.classList.contains("disabled")
          );
          hasNextPage = !isDisabled;

          if (hasNextPage) {
            // Click the "Next" button and wait for the page to load
            await Promise.all([nextButton.click()]);
          }
        } else {
          hasNextPage = false;
        }
      } catch (err) {
        if (
          err.message == "Node is either not visible or not an HTMLElement" ||
          err.message == "Node is detached from document"
        ) {
          delay(2000);
        } else {
          hasNextPage = false;
        }
        console.log(Error(err), err.message, err.number);

        // Use delay to handle transient issues
        await delay(2000);
      }
    }
    console.log("count: ", count);
  } catch (error) {
    console.error("Error scraping PDFs:", error);
  } finally {
    await browser.close();
  }

  return links;
}
