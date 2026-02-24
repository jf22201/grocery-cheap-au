import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

import { Browser, Page } from "puppeteer";
export interface SiteConfig {
  name: string;
  selector: string; //This needs to be an element on the particular retailers site to identify when the product page has actually loaded.
  timeout?: number;
}
export const viewports = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1536, height: 864 },
  { width: 1440, height: 900 },
];

export const initBrowser = async (): Promise<Browser> => {
  puppeteer.use(StealthPlugin());
  let browser = await puppeteer.launch({
    headless: true, // Use true (new headless) for better performance and evasion
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  return browser;
};

export async function scrapePage(
  browser: Browser,
  url: string,
  config: SiteConfig,
) {
  const page = await browser.newPage();
  const randomVP = viewports[Math.floor(Math.random() * viewports.length)];
  await page.setViewport(randomVP);
  await page.goto(url, { waitUntil: "networkidle2" });
  await page.waitForSelector(config.selector, {
    visible: true,
    timeout: config?.timeout || 15000,
  });
  const html = await page.content();
  page.close();
  return html;
}
