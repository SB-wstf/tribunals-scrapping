import createIfNotExists from "../utils/saveToMongo.js";

export const scrapeType1 = async (page, url, tagString) => {
  console.log("url", url);
  console.log("tagString", tagString);

  try {
    // Navigate to the URL and wait for the page to fully load
    await page.goto(url, { waitUntil: "load", timeout: 600000 });

    let paginationFlag = false;
    do {
      // Wait for the anchor tags to load
      await page.waitForSelector("a", { timeout: 5000 });

      // Extract data from anchor tags
      const allAnchorData = await page.evaluate((tagString) => {
        const anchors = Array.from(document.querySelectorAll("a"));
        return anchors.map((anchor) => {
          const href = anchor.href;
          let title = null;
          const parentTd = anchor.closest("td");
          if (parentTd) {
            title = parentTd?.parentElement?.children[1]?.innerText?.trim();
          }
          return { pdfUrls: href, title, tagString };
        });
      }, tagString);

      console.log("allAnchorData", allAnchorData);

      // Loop through all anchor data
      for (let i = 0; i < allAnchorData.length; i++) {
        const anchor = allAnchorData[i];

        // Skip invalid data (null or missing fields, non-PDF links, or empty fields)
        if (
          !anchor.pdfUrls || // Ensure there's a valid href
          !anchor.title || // Ensure there's a valid title
          !anchor.tagString || // Ensure there's a valid tagString
          !anchor.pdfUrls.toLowerCase().endsWith(".pdf") // Only process PDFs
        ) {
          continue;
        }

        // Assuming `createIfNotExists` saves data to MongoDB
        const res = await createIfNotExists(anchor);
        if (res.status === "stop") {
          console.log("stoppring scrapping bcoz same data found continuously ****************");
          return { status: "stop" };
        }

      }

      // Check for pagination button
      try {
        const nextButtonSelector = "#example_next";
        const isDisabled = await page.$eval(nextButtonSelector, (button) => {
          return button.classList.contains("disabled");
        });

        if (!isDisabled) {
          // Click the "Next" button if it's not disabled
          await page.click(nextButtonSelector);
          console.log('Clicked the "Next" button');
          paginationFlag = true;
        } else {
          paginationFlag = false;
          console.log('The "Next" button is disabled');
        }
      } catch (error) {
        console.log("Can not find next button");
      }
    } while (paginationFlag);
  } catch (error) {
    console.log("error", error);
  }
};

export const scrapeType2 = async (page, url, tagString) => {
  console.log("url", url);
  console.log("tagString", tagString);

  try {
    // Navigate to the URL and wait for the page to fully load
    await page.goto(url, { waitUntil: "load", timeout: 600000 });

    let paginationFlag = false;
    do {
      // Wait for the anchor tags to load
      await page.waitForSelector("a", { timeout: 5000 });

      // Extract data from anchor tags
      const allAnchorData = await page.evaluate((tagString) => {
        const anchors = Array.from(document.querySelectorAll("a"));
        return anchors.map((anchor) => {
          const href = anchor.href;
          let title = null;
          const parentTd = anchor.closest("td");
          if (parentTd) {
            if (
              parentTd?.parentElement?.children[1]?.innerText?.trim() ==
              anchor?.innerText?.trim()
            ) {
              title = anchor?.innerText?.trim();
            } else {
              title =
                parentTd?.parentElement?.children[1]?.innerText?.trim() +
                " - " +
                anchor?.innerText?.trim();
            }
          }
          return { pdfUrls: href, title, tagString };
        });
      }, tagString);

      console.log("allAnchorData", allAnchorData);

      // Loop through all anchor data
      for (let i = 0; i < allAnchorData.length; i++) {
        const anchor = allAnchorData[i];

        // Skip invalid data (null or missing fields, non-PDF links, or empty fields)
        if (
          !anchor.pdfUrls || // Ensure there's a valid href
          !anchor.title || // Ensure there's a valid title
          !anchor.tagString || // Ensure there's a valid tagString
          !anchor.pdfUrls.toLowerCase().endsWith(".pdf") // Only process PDFs
        ) {
          continue;
        }

        // Assuming `createIfNotExists` saves data to MongoDB
        const res = await createIfNotExists(anchor);
        if (res.status === "stop") {
          console.log("stoppring scrapping bcoz same data found continuously ****************");
          return { status: "stop" };
        }

      }

      try {
        // Check for pagination button
        const nextButtonSelector = "#example_next";
        const isDisabled = await page.$eval(nextButtonSelector, (button) => {
          return button.classList.contains("disabled");
        });

        if (!isDisabled) {
          // Click the "Next" button if it's not disabled
          await page.click(nextButtonSelector);
          console.log('Clicked the "Next" button');
          paginationFlag = true;
        } else {
          paginationFlag = false;
          console.log('The "Next" button is disabled');
        }
      } catch (error) {
        console.log("Can not find next button");
      }
    } while (paginationFlag);
  } catch (error) {
    console.log("error", error);
  }
};
