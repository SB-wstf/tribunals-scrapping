import cron from "node-cron";
import { launchBrowser } from "./config/browserConfig.js";
import connectToDB from "./config/mongoConfig.js";
import { scrapeType1, scrapeType2 } from "./services/scrapeHelper.js";

export const scrapeTdsat = async () => {
  // Connect to MongoDB
  connectToDB();

  // Launch the browser
  const browser = await launchBrowser();
  const page = await browser.newPage();

  // scrape calender Page
  let res = await scrapeType1(
    page,
    "https://tdsat.gov.in/writereaddata/Delhi/docs/introduction.php?y=8",
    "Telecom Disputes Settlement and Appellate Tribunal <-> Calender"
  );
  if (res?.status === "stop") {
    console.log("stoppring scrapping bcoz same data found continuously ****************");

    await browser.close();
    return { status: "stop" };
  }

  // scrape about-rti page
  res = await scrapeType1(
    page,
    "https://tdsat.gov.in/writereaddata/Delhi/docs/introduction.php?y=12",
    "Telecom Disputes Settlement and Appellate Tribunal <-> About <-> RTI"
  );
  if (res?.status === "stop") {
    console.log("stoppring scrapping bcoz same data found continuously ****************");

    await browser.close();
    return { status: "stop" };
  }

  // scrape about-introduction  page
  res = await scrapeType1(
    page,
    "https://tdsat.gov.in/writereaddata/Delhi/docs/introduction.php?y=1",
    "Telecom Disputes Settlement and Appellate Tribunal <-> About <-> Introduction"
  );
  if (res?.status === "stop") {
    console.log("stoppring scrapping bcoz same data found continuously ****************");

    await browser.close();
    return { status: "stop" };
  }

  // scrape about-procedure  page
  res = await scrapeType1(
    page,
    "https://tdsat.gov.in/writereaddata/Delhi/docs/introduction.php?y=3",
    "Telecom Disputes Settlement and Appellate Tribunal <-> About <-> TDSAT Procedure 2005"
  );
  if (res?.status === "stop") {
    console.log("stoppring scrapping bcoz same data found continuously ****************");

    await browser.close();
    return { status: "stop" };
  }

  // scrape about-Seminar and Events  page
  res = await scrapeType2(
    page,
    "https://tdsat.gov.in/admin/introduction/view.php",
    "Telecom Disputes Settlement and Appellate Tribunal <-> About <-> Seminar and Events"
  );
  if (res?.status === "stop") {
    console.log("stoppring scrapping bcoz same data found continuously ****************");

    await browser.close();
    return { status: "stop" };
  }

  // scrape Notices/Circulars  page
  res = await scrapeType2(
    page,
    "https://tdsat.gov.in/writereaddata/Delhi/docs/notices.php",
    "Telecom Disputes Settlement and Appellate Tribunal <-> Notices/Circulars"
  );
  if (res?.status === "stop") {
    console.log("stoppring scrapping bcoz same data found continuously ****************");

    await browser.close();
    return { status: "stop" };
  }

  // scrape Tenders - Live  page
  res = await scrapeType2(
    page,
    "https://tdsat.gov.in/writereaddata/Delhi/docs/tender.php",
    "Telecom Disputes Settlement and Appellate Tribunal <-> Tenders <-> Live"
  );
  if (res?.status === "stop") {
    console.log("stoppring scrapping bcoz same data found continuously ****************");

    await browser.close();
    return { status: "stop" };
  }

  // scrape Tenders - Archieve  page
  res = await scrapeType2(
    page,
    "https://tdsat.gov.in/writereaddata/Delhi/docs/tender1.php",
    "Telecom Disputes Settlement and Appellate Tribunal <-> Tenders <-> Archieve"
  );
  if (res?.status === "stop") {
    console.log("stoppring scrapping bcoz same data found continuously ****************");

    await browser.close();
    return { status: "stop" };
  }

  // scrape Mediation Center - Introduction  page
  res = await scrapeType1(
    page,
    "https://tdsat.gov.in/writereaddata/Delhi/docs/introduction.php?y=5",
    "Telecom Disputes Settlement and Appellate Tribunal <-> Mediation Center <-> Introduction"
  );
  if (res?.status === "stop") {
    console.log("stoppring scrapping bcoz same data found continuously ****************");

    await browser.close();
    return { status: "stop" };
  }

  // scrape Mediation Center - List of Mediators  page
  res = await scrapeType1(
    page,
    "https://tdsat.gov.in/writereaddata/Delhi/docs/introduction.php?y=6",
    "Telecom Disputes Settlement and Appellate Tribunal <-> Mediation Center <-> List of Mediators"
  );
  if (res?.status === "stop") {
    console.log("stoppring scrapping bcoz same data found continuously ****************");

    await browser.close();
    return { status: "stop" };
  }

  // scrape Mediation Center - Disposed of Cases  page
  res = await scrapeType1(
    page,
    "https://tdsat.gov.in/writereaddata/Delhi/docs/introduction.php?y=7",
    "Telecom Disputes Settlement and Appellate Tribunal <-> Mediation Center <-> Disposed of Cases"
  );
  if (res?.status === "stop") {
    console.log("stoppring scrapping bcoz same data found continuously ****************");

    await browser.close();
    return { status: "stop" };
  }

  // Close the browser
  await browser.close();
};

// Schedule the scraping job to run at 12 AM every day for each website
// cron.schedule("0 0 * * *", async () => {
//   console.log("Running scheduled daily scrape...");
//   scrapeTdsat();
// });

// (async () => {
//   console.log("Running initial scraping...");
//  await scrapeTdsat();
// })();

export const scrapeTDSAT = scrapeTdsat;
