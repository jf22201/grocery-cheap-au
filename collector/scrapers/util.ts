import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

import { Browser, Page } from "puppeteer";
const randomDelay = (min: number, max: number) =>
  new Promise((resolve) =>
    setTimeout(resolve, Math.random() * (max - min) + min),
  ); //Function for random delay to increase human-like behaviour

/**
 * Configuration settings for Puppeteer request interceptor. Used to reduce bandwidth and speed by blocking as much unneeded content as possible.
 */
export interface InterceptorConfig {
  /**
   * A list of Puppeteer ResourceTypes to abort.
   * @example ['image','font','media']
   */
  /**
   * A list of domain substrings or tracking script names to block.
   * If a request URL contains any of these strings, the request is aborted.
   * @example ['facebook.net', 'google-analytics', 'googletagmanager']
   */
  blockedResources: string[];
  blockTrackers: string[]; // tracking domains to not complete request for if url contains the string i.e: [ 'facebook.net','google-analytics','googletagmanager']
}

/** Puppeteer configuration settings for each retailer, mostly used to pass in DOM selector to know when the price page has actually loaded */
export interface SiteConfig {
  name: string;
  /**
   * Selector string for puppeteer to detect to determine when price page has loaded.
   * @example ".product__title"
   */
  selector: string;
  timeout?: number;
  interceptorConfig?: InterceptorConfig;
}
export const viewports = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1536, height: 864 },
  { width: 1440, height: 900 },
];

export const initBrowser = async (...extraArgs: string[]): Promise<Browser> => {
  puppeteer.use(StealthPlugin());
  let browser = await puppeteer.launch({
    headless: true, // Use true (new headless) for better performance and evasion
    args: ["--no-sandbox", "--disable-setuid-sandbox", ...extraArgs],
  });
  return browser;
};

/**
 * Function for scraping the HTML data of the retailers product page.
 * @param browser Puppeteer Browser object to perform the requests to url
 * @param url url to obtain HTML for
 * @param config SiteConfig for individual retailer site that will be scraped
 * @returns
 */
export async function scrapePage(
  browser: Browser,
  url: string,
  config: SiteConfig,
) {
  const page = await browser.newPage();
  const randomVP = viewports[Math.floor(Math.random() * viewports.length)];
  await page.setViewport(randomVP);
  await randomDelay(1, 3); //wait between 1-3 seconds
  await page.goto(url, { waitUntil: "networkidle2" });
  await page.waitForSelector(config.selector, {
    visible: true,
    timeout: config?.timeout || 15000,
  });
  const html = await page.content();
  page.close();
  return html;
}
