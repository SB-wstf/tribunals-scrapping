import puppeteer from "puppeteer";

export async function launchBrowser() {
  return puppeteer.launch({
    // headless: false,
    // defaultViewport: null,
    protocolTimeout: 120000,
  });
}
