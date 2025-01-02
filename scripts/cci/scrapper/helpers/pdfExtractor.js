//pdfExtracter.js
import { addToNewPDFLinks, savetoMongo } from "./pdfHandler.js";
import logger from "../config/logger.js";

export const getPdf = async (
  url,
  page,
  urlQueue,
  visitedPdfUrls,
  newPDFLinks,
  visitedUrls
) => {
  try {
    // console.log("scrapping from: ", url);
    await page.goto(url, { waitUntil: "networkidle2" });
    try {
      await page.waitForSelector("a", { timeout: 5000 });
    } catch (error) {
      // Element not found within the timeout, skip without throwing error
      console.log("Element not found, skipping...");
      return;
    }

    const allAnchorData = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll("a"));
    
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
          const pdfLink = extractPdfFromOnClick(anchor.getAttribute("onclick"));
          if (pdfLink) href = pdfLink; // Update href with extracted PDF link
        }
    
        // Ensure the title does not start with "Download" or "View"
        let isNum=Number(title)
        if (
          !title || title.length <= 5 || !isNaN(isNum) ||
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
         isNum=Number(title)
         const row = anchor.closest("tr");
         if ((!title || title.length <= 5 || !isNaN(isNum)) && row) {
           const precedingTDs = Array.from(row.querySelectorAll("td")).slice(0, -1); // Exclude the last <td> containing the anchor
           title = precedingTDs.map((td) => td.innerText.trim()).join(" - ");
           title = cleanTitle(capitalize(title));
         }
    
        return {
          href: href, // Final href
          title: title, // Final title after cleanup
        };
      });
    });
    

    console.log("allAnchorData",allAnchorData);

    for (const anchorData of allAnchorData) {
      const { href, title } = anchorData;

      if (href.toLowerCase().endsWith(".pdf") && !visitedPdfUrls.has(href)) {
        visitedPdfUrls.add(href);

        logger.info("found pdf " + href);

        let tagString = await page.evaluate(() => {
          try {
            const breadCrumb = document.querySelector(
              ".breadcrumb"
            );
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
        savetoMongo(pdfLink);
        // Add the new PDF link to newPDFLinks, considering visitedPdfUrls
        addToNewPDFLinks(pdfLink, newPDFLinks);
      } else if (
        href.startsWith("https://www.cci.gov.in/") &&
        !visitedUrls.has(href) && // Avoid visiting the same URL
        !href.toLowerCase().endsWith(".xlsx") &&
        !href.toLowerCase().endsWith(".doc") &&
        !href.toLowerCase().endsWith(".docx") &&
        !href.toLowerCase().endsWith(".xls") &&
        !href.toLowerCase().endsWith(".xlsb") &&
        !href.toLowerCase().endsWith(".xlsm") &&
        !href.toLowerCase().endsWith(".zip") &&
        !href.toLowerCase().endsWith(".mp4") &&
        !href.toLowerCase().endsWith(".png") &&
        !href.toLowerCase().endsWith(".pdf") &&
        !href.toLowerCase().endsWith(".jpg") &&
        !href.toLowerCase().endsWith(".jpeg") &&
        !href.toLowerCase().endsWith(".webp") &&
        !href.toLowerCase().endsWith(".webm") &&
        !href.toLowerCase().endsWith(".epub") &&
        !href.toLowerCase().endsWith(".jfif") &&
        !href.toLowerCase().endsWith(".mp3") &&
        !href.toLowerCase().includes("index.php") &&
        !href.toLowerCase().includes("index.html") &&
        !href.toLowerCase().includes("/hi") &&
        !href.toLowerCase().includes("#") &&
        !href.toLowerCase().includes("/set-locale?locale=hi")
      ) {
        urlQueue.add(href);
        logger.debug(urlQueue)
        logger.info("adding url: " + href);
      }
    }
  } catch (error) {
    logger.error("Error during PDF extraction:"+ error.message);
  }
};
