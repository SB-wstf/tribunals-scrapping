// scrapingFunctions.js
// import { scrapeCESTAT } from "../scripts/cestat/scrapper/index.js";
// import { scrapeITAT } from "../scripts/itat/scrapper/itat/scrapper/index.js";
import { scrapeCCI } from "../scripts/cci/scrapper/index.js";
import { scrapeCGAT } from "../scripts/cgat/scrapper/index.js";
import { scrapeNCLAT } from "../scripts/nclat/scrapper/index.js";
// import { scrapeNCLT } from "../scripts/nclt/scrapper/index.js";
import { scrapeTDSAT } from "../scripts/tdsat/scrapper/index.js";

export const functionMap = {
  nclat: scrapeNCLAT,
  tdsat: scrapeTDSAT,
  // itat: scrapeITAT,
  cgat: scrapeCGAT,
  cci: scrapeCCI,
  // nclt: scrapeNCLT,
  // cestat: scrapeCESTAT,
};
