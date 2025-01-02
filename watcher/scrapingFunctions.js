// scrapingFunctions.js
import { scrapeCESTAT } from "../scripts/cestat/index.js";
import { scrapeITAT } from "../scripts/itat/scrapper/new.js";
import { scrapeCCI } from "../scripts/cci/scrapper/index.js";
import { scrapeCGAT } from "../scripts/cgat/scrapper/index.js";
import { scrapeNCLAT } from "../scripts/nclat/scrapper/index.js";
import { scrapeTDSAT } from "../scripts/tdsat/scrapper/index.js";

export const functionMap = {
  nclat: scrapeNCLAT,
  tdsat: scrapeTDSAT,
  itat: scrapeITAT,
  cgat: scrapeCGAT,
  cci: scrapeCCI,
  // nclt: scrapeNCLT,  //site is under maintenance
  cestat: scrapeCESTAT,
};
