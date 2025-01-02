import { logger } from "../config/logger.js";
import { delay } from "../utils/delay.js";
import createIfNotExists from "../utils/saveToMongo.js";

// Function to scrape data from a given URL and handle pagination if found
export const getPdf = async (url, page, urlQueue, visitedPdfUrls, allPdf) => {
  try {
    console.log("scraping from: ", url);

    // Go to the URL
    await page.goto(url, { waitUntil: "networkidle2" });

    // do scrapping for of the page
    try {
      // Wait for <a> tags on page
      try {
        await page.waitForSelector("a", { timeout: 5000 });
      } catch (error) {
        // Element not found within the timeout, skip without throwing error
        console.log("Element not found, skipping...", error.message);
        return;
      }

      // await delay(10000);
      // Get all the <a> elements
      const allAnchorData = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll("a"));

        return anchors.map((anchor) => {
          const href = anchor.href;
          let title = anchor.innerText.trim() || null; // Ensure title is trimmed

          let anchorInnerText = title;

          // Check if the parent element is a <td> and look for the sibling with data-th attributes
          const parentTd = anchor.closest("td");
          if (parentTd) {
            const titleTd = parentTd.parentElement.querySelector("td.views-field-titleg");

            if (titleTd) {
              // Extract the title from the titleTd's text content
              title = titleTd.innerText.trim(); // Ensure title is trimmed
            } else {
              const secondaryTitle =
                parentTd.parentElement.querySelector("td.views-field-nothingg");
              if (secondaryTitle) {
                // Extract the title from the <th> text content
                title = secondaryTitle.innerText.trim(); // Ensure title is trimmed
              } else {
                // loop over all the sibling tds and merge the data
                const siblingTds = parentTd.parentElement.querySelectorAll("td");

                // Initialize an array to store the inner text of each <td>
                const siblingData = [];

                // Loop over each sibling <td> and extract the inner text
                siblingTds.forEach((td) => {
                  siblingData.push(td.innerText.trim()); // Trim to remove any extra spaces
                });

                // Join the array elements with a space separator
                title = siblingData.join(" ");
              }
            }
          }

          function extractFilenameFromUrl(url) {
            try {
              // Create a URL object
              const urlObj = new URL(url);

              // Get the pathname from the URL
              const pathname = urlObj.pathname;

              // Extract the filename without extension
              const filenameWithExtension = pathname.split("/").pop();
              let filename = filenameWithExtension.split(".")[0];

              // Function to remove unwanted patterns
              function removePatterns(input) {
                const patterns = [/[%]/g]; // Add more patterns as needed
                let cleaned = input;

                patterns.forEach((pattern) => {
                  cleaned = cleaned.replace(pattern, "");
                });

                return cleaned.trim(); // Return cleaned filename
              }

              // Clean the filename
              filename = removePatterns(filename);

              return filename; // Return the filename
            } catch (error) {
              return null;
            }
          }

          // Remove unwanted patterns
          function removePatterns(input) {
            // Define the patterns to remove with word boundaries
            const patterns = [
              /\bview pdf\b/i,
              /\bview link\b/i,
              /\bview\b/i,
              /\bRead More\b/i,
              /\bRead\b/i,
              /\bshare link\b/i,
              /\bpdf link\b/i,
              /\blink\b/i,
              /\bshare\b/i,
              /\bclick here to view\b/i,
              /\bclick here to\b/i,
              /\bclick here\b/i,
              /\bclick to download\b/i,
              /\bclick to\b/i,
              /\bclick\b/i,
              /\bdownload\b/i,
              /\bdownload pdf\b/i,
              /\(\d+\s?(kb|mb)\)/gi, // Matches patterns like "(20kb)", "(30 mb)"
              /\d+\s?(kb|mb)/gi, // Matches patterns like "270 kb", "23mb"
              /\d+\.\s/g, // Matches numbered lists like "1.", "2."
              /\.pdf\b/i, // Matches ".pdf" file extension
              /\(PDF\s*\d*\.\)/i, // Matches "(PDF 2.)" or "(PDF .)"
              /\(PDF\s*\)/i, // Matches "(PDF )"
              /\bpdf\b/i,
            ];

            // Combine the patterns into a single regular expression
            const combinedPattern = new RegExp(
              patterns.map((pattern) => pattern.source).join("|"),
              "gi"
            );

            // Remove unwanted special characters except for (){}[],.-_
            // const unwantedCharsPattern = /[^a-zA-Z0-9 (){}[\],.-_&]/g;
            const removeSpecificCharsPattern = /[<>^#@`~*+=;:]/g;

            // Clean the input
            let cleanedInput = input
              .replace(combinedPattern, "")
              .replace(removeSpecificCharsPattern, "")
              .trim(); // Ensure cleaned text is trimmed

            // Remove extra spaces (double spaces or more)
            cleanedInput = cleanedInput.replace(/\s{2,}/g, " ");

            return cleanedInput; // Return the final cleaned input
          }

          if (anchorInnerText) {
            anchorInnerText = removePatterns(anchorInnerText);
          } else {
            anchorInnerText = "";
          }

          // Extract title from link if title not found or empty string
          if (!title || title.length < 1) {
            title = extractFilenameFromUrl(href); // Fallback if title is empty
            if (!title || title.length < 3)
              title =
                "National Company Law Appellate Tribunal" +
                " " +
                anchorInnerText +
                " " +
                Date.now();
          }

          // Function to clean the string wit repetative commas after cleaning
          function cleanStringExtraSpecialChars(input) {
            // Remove spaces around commas
            let cleaned = input.replace(/\s*,\s*/g, ","); // Removes spaces around commas

            // Remove parentheses and their contents if they do not hold valid characters
            cleaned = cleaned.replace(/\([^(\p{L}\d\s)]*\)/gu, ""); // Removes empty or special-character-only parentheses

            // Define unwanted special characters to remove (adjust as needed)
            const unwantedCharsPattern = /[!"#$%&'()*+,/:;<=>?@[\\\]_^`{|}~]/gu; // List of unwanted special characters

            // Replace unwanted special characters (excluding commas, periods, and hyphens) with a space
            cleaned = cleaned.replace(unwantedCharsPattern, " "); // Remove unwanted characters

            // Remove consecutive commas
            cleaned = cleaned.replace(/,+/g, ","); // Replace multiple commas with a single comma

            // Trim and reduce multiple spaces to a single space
            cleaned = cleaned.trim().replace(/\s+/g, " ");

            // Remove leading or trailing commas
            cleaned = cleaned.replace(/^,|,$/g, "");

            return cleaned;
          }

          if (anchorInnerText && anchorInnerText.length > 3 && anchorInnerText !== title)
            title = title + ", " + anchorInnerText;

          // clean title
          if (title) {
            title = removePatterns(title);
            title = cleanStringExtraSpecialChars(title);
            if (title.length < 3)
              title = "National Company Law Appellate Tribunal" + " " + title + " " + Date.now(); // Fallback if title is even empty
          }
          return { href, title }; // Return the href and cleaned title
        });
      });

      // Loop through each <a> element
      for (const anchorData of allAnchorData) {
        const { href, title } = anchorData;

        if (href.toLowerCase().endsWith(".pdf") && !visitedPdfUrls.has(href)) {
          visitedPdfUrls.add(href);

          // Add your breadcrumb or other logic as needed
          let tagString = await page.evaluate(() => {
            try {
              const breadCrumb = document.querySelector("#block-nclat-breadcrumbs ol");
              if (breadCrumb) {
                const breadcrumbItems = Array.from(breadCrumb.querySelectorAll("li"))
                  .map((item) => item.innerText.trim())
                  .filter((text) => !/(home|హోమ్|home page|Home)/i.test(text)); // Skip any variation of "Home" ,"home page" or "హోమ్"(home in teleugu)

                // If there are valid breadcrumb items, join them, else return only "website name"
                if (breadcrumbItems.length > 0) {
                  return (
                    "National Company Law Appellate Tribunal" +
                    " <-> " +
                    breadcrumbItems
                      .join(" <-> ")
                      .replace(/(<-> )+/g, " <-> ")
                      .trim()
                  );
                } else {
                  return "National Company Law Appellate Tribunal"; // Only "website name" if no valid breadcrumb items
                }
              }
            } catch (error) {
              // console.error("Error extracting breadcrumb:", error);
            }
            return "National Company Law Appellate Tribunal"; // Default to "website name" in case of error or no breadcrumbs
          });

          // remove extra spaces
          tagString = tagString.replace(/\s+/g, " ").trim();

          const pdfLink = {
            tagString,
            title,
            pdfUrls: href,
            pageUrl: url,
          };
          const res = await createIfNotExists(pdfLink);
          if (res.status === "stop") {
            console.log("stoppring scrapping bcoz same data found continuously ****************");
            return { status: "stop" };
          }

          // console.log("pdfLink", pdfLink);
          allPdf.push(pdfLink);
        } else if (
          href.startsWith("https://nclat.nic.in/") &&
          !visitedPdfUrls.has(href) && // Avoid visiting the same URL
          !href.toLowerCase().endsWith(".xlsx") &&
          !href.toLowerCase().endsWith(".doc") &&
          !href.toLowerCase().endsWith(".docx") &&
          !href.toLowerCase().endsWith(".xls") &&
          !href.toLowerCase().endsWith(".xlsb") &&
          !href.toLowerCase().endsWith(".xlsm") &&
          !href.toLowerCase().endsWith(".zip") &&
          !href.toLowerCase().endsWith(".mp4") &&
          !href.toLowerCase().endsWith(".png") &&
          !href.toLowerCase().endsWith(".jpg") &&
          !href.toLowerCase().endsWith(".jpeg") &&
          !href.toLowerCase().endsWith(".webp") &&
          !href.toLowerCase().endsWith(".webm") &&
          !href.toLowerCase().endsWith(".epub") &&
          !href.toLowerCase().endsWith(".mp3") &&
          !href.toLowerCase().includes("index.php") &&
          !href.toLowerCase().includes("index.html") &&
          !href.toLowerCase().includes("#")
        ) {
          // Push non-PDF URLs to the queue
          urlQueue.add(href);
        }
      }
    } catch (error) {
      console.log("Error during PDF extraction:", error);
    }
  } catch (error) {
    console.error("Error during PDF extraction:", error);
  }
};
