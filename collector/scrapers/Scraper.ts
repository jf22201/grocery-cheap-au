import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { Browser, PuppeteerLifeCycleEvent } from "puppeteer-core";
import chromium from "@sparticuz/chromium";
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

  blockedResources: string[];
  /**
   * A list of domain substrings or tracking script names to block.
   * If a request URL contains any of these strings, the request is aborted.
   * @example ['facebook.net', 'google-analytics', 'googletagmanager']
   */
  blockedURL: string[];
}

/** Puppeteer configuration settings for each retailer, mostly used to pass in DOM selector to know when the price page has actually loaded
 *
 */
export interface SiteConfig {
  name: string;
  /**
   * Selector string for puppeteer to detect to determine when price page has loaded.
   * @example ".product__title"
   */
  selector: string;
  /**
   * Time in milliseconds until to deem the scrape as failed
   * @example 5000
   */
  timeout?: number;
  /**
   * InterceptorConfig to provide to Puppeteer to determine which requests/content to ignore.
   */
  interceptorConfig?: InterceptorConfig;
  /**
   * waitUntil value to pass into page.goto() to determine when page has completed loading
   * @example "domcontentloaded"
   */
  waitUntil?: PuppeteerLifeCycleEvent;
}
export interface ProxyInfo {
  host: string;
  port: number;
  username?: string;
  password?: string;
}
/**
 * Interface to store all details of the current scrape if something goes wrong.
 * @param html This is the last loaded page before an error was thrown
 * @param url The url that was attempted to be scraped
 * @param proxy The proxy that was used if applicable
 * @param error The error that was thrown to scraper.
 */
export interface ScrapingErrorDetails {
  html: string;
  url: string;
  proxy?: string;
  siteConfig: string;
  error: {
    //Serialized error
    message?: string;
    stack?: string;
    name?: string;
  };
}

export const viewports = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1536, height: 864 },
  { width: 1440, height: 900 },
];

/**
 * Custom error to store associated details of a failed scrape.
 */
export class ScrapingError extends Error {
  constructor(scrapingErrorDetails: ScrapingErrorDetails) {
    super(JSON.stringify(scrapingErrorDetails));
  }
}

export default class Scraper {
  private browser: Browser | null = null;
  private proxies: ProxyInfo[] | [];
  private proxyIdx: number | 0; //selector for which proxy is currently in use
  private proxyInUse: boolean;
  private pagesScaped: number = 0; //counter for number of pages scraped, used for preemptive proxy switching
  private maxPagesPerProxy: number = 30; //max number of pages to scrape before switching proxy to reduce chance of getting blocked

  constructor(proxies?: ProxyInfo[]) {
    if (proxies) {
      this.proxies = proxies;
      this.proxyIdx = 0; //Default to first proxy in list
      this.proxyInUse = true;
    } else {
      //set all proxy vars to null, this is used to determine if a proxy is in use later.
      this.proxies = [];
      this.proxyIdx = 0;
      this.proxyInUse = false;
    }
  }
  private get currentProxy(): ProxyInfo {
    return this.proxies[this.proxyIdx]!;
  }
  async initBrowser(...extraArgs: string[]): Promise<void> {
    puppeteer.use(StealthPlugin());
    let args = [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--single-process",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--no-zygote",
      ...extraArgs,
    ];
    if (this.proxyInUse) {
      //add proxy arg if proxy in use
      args.push(
        `--proxy-server=${this.currentProxy.host}:${this.currentProxy.port}`,
      );
    }
    this.browser = await puppeteer.launch({
      headless: true,
      args: args,
      executablePath: await chromium.executablePath(),
    });
  }
  /**
   * Function for scraping the HTML data of the retailers product page.
   * @param browser Puppeteer Browser object to perform the requests to url
   * @param url url to obtain HTML for
   * @param siteConfig SiteConfig for individual retailer site that will be scraped
   * @param interceptorConfig Optional - InterceptorConfig to provide rules for Puppeteer on what content/requests to ignore.
   * @returns html body of site as string
   */
  async scrapePage(
    url: string,
    siteConfig: SiteConfig,
    interceptorConfig?: InterceptorConfig,
  ): Promise<string> {
    if (!this.browser) {
      throw new Error("Browser not initialised");
    }

    const page = await this.browser.newPage();
    const randomVP = viewports[Math.floor(Math.random() * viewports.length)];
    await page.setViewport(randomVP);
    //authenticate username + password for proxy if needed
    if (
      this.proxyInUse &&
      this.currentProxy.username &&
      this.currentProxy.password
    ) {
      await page.authenticate({
        username: this.currentProxy.username,
        password: this.currentProxy.password,
      });
    }
    //block to perform interceptor logic if config provided.
    if (interceptorConfig) {
      page.setRequestInterception(true);
      page.on("request", (req) => {
        const resourceType = req.resourceType();
        const url = req.url();
        if (interceptorConfig.blockedResources?.includes(resourceType)) {
          return req.abort();
        }

        if (
          interceptorConfig.blockedURL?.some((domain) => url.includes(domain))
        ) {
          return req.abort();
        }
        //Otherwise ok.
        return req.continue();
      });
    }
    await randomDelay(1000, 3000); //wait between 1-3 seconds to reduce chance of being blocked.
    let html = "";
    let initialHtml = ""; //This is to store any html that occurs before the actual product page loads, currently just used for logging on error
    try {
      await page.goto(url, {
        waitUntil: siteConfig?.waitUntil || "networkidle2",
      });
      initialHtml = await page.content(); //store page after networkidle2 but before waiting for selector
      await page.waitForSelector(siteConfig.selector, {
        timeout: siteConfig?.timeout || 15000,
      });
      html = await page.content();
    } catch (err) {
      if (err instanceof Error) {
        throw new ScrapingError({
          html: initialHtml,
          url,
          siteConfig: siteConfig.name,
          ...(this.proxyInUse && {
            proxy: `${this.currentProxy.host}:${this.currentProxy.port}`,
          }), //Only add proxy info if in use.
          error: {
            message: err.message,
            stack: err?.stack,
            name: err.name,
          },
        });
      } else {
        throw err; //Just throw anything else that is not an error
      }
    } finally {
      page.close();
    }
    return html;
  }
  /**
   * Function to attempt to scrape the given url, will retry up to 3 times before switching proxy. If all proxies are exhausted, it will give up.
   * @param url - url to scrape
   * @param siteConfig - siteConfig to determine when loading is done
   * @param interceptorConfig - interceptorConfig to determine what to filter to save bandwidth
   * @returns
   */
  async scrapeWithRetry(
    url: string,
    siteConfig: SiteConfig,
    interceptorConfig: InterceptorConfig,
  ): Promise<string> {
    let currentAttempt = 0;
    let proxiesUsed = 1;
    if (
      this.pagesScaped % this.maxPagesPerProxy === 0 &&
      this.pagesScaped !== 0
    ) {
      console.log(`Switching proxy after scraping ${this.pagesScaped} pages`);
      await this.changeProxy();
    }
    while (true) {
      try {
        const html = await this.scrapePage(url, siteConfig, interceptorConfig);
        this.pagesScaped++;
        return html;
      } catch (err) {
        if (err instanceof ScrapingError) {
          const detailsJson = JSON.parse(err.message) as ScrapingErrorDetails;
          console.error("Scrape failed:", {
            url: detailsJson.url,
            errorMessage: detailsJson.error.message,
            errorName: detailsJson.error.name,
            html: detailsJson.html,
          });
        } else {
          console.log("Scrape failed:", err);
        }
        currentAttempt++;
        console.log(currentAttempt);
        if (currentAttempt >= 3) {
          if (proxiesUsed >= this.proxies.length) {
            throw new Error("All proxies exhausted - giving up.");
          }
          console.log("Scraping failed 3 consecutive times, switching proxy");
          proxiesUsed++;
          await this.changeProxy();
          currentAttempt = 0;
        }
      }
    }
  }

  async closeBrowser(): Promise<void> {
    this.browser?.close();
  }
  /**
   * Used to change the current proxy provider for the scraper.
   * @param proxyIdx Optional - choice of which proxy to use next, if left empty will just switch to next proxy in rotation.
   */
  async changeProxy(proxyIdx?: number): Promise<void> {
    if (!this.browser) {
      throw new Error("Browser not initialised");
    }
    if (proxyIdx !== undefined) {
      if (proxyIdx < 0 || proxyIdx >= this.proxies.length) {
        throw new Error("Index for proxy out of range");
      }
      await this.closeBrowser();
      this.proxyIdx = proxyIdx;
      await this.initBrowser();
    } else {
      await this.closeBrowser();
      this.proxyIdx = (this.proxyIdx + 1) % this.proxies.length;
      console.log(
        `Switching to proxy ${this.currentProxy.host}:${this.currentProxy.port}`,
      );
      await this.initBrowser();
    }
  }
}
