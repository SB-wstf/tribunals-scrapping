import cestat from "./cestat.js";
import notice from "./notice.js";

async function main() {
  try {
    console.log("RUNNING CESTAT SCRAPER");
    await cestat();
    await notice();
  } catch (error) {
    console.error("Error main:", error);
  }
}

export const scrapeCESTAT = main();
