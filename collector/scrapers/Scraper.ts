import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { Browser, Page, PuppeteerLifeCycleEvent } from "puppeteer";
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

export const viewports = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1536, height: 864 },
  { width: 1440, height: 900 },
];

export default class Scraper {
  private browser: Browser | null = null;
  private proxies: ProxyInfo[] | [];
  private proxyIdx: number | 0; //selector for which proxy is currently in use
  private proxyInUse: boolean;

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
    let args = ["--no-sandbox", "--disable-setuid-sandbox", ...extraArgs];
    if (this.proxyInUse) {
      //add proxy arg if proxy in use
      args.push(
        `--proxy-server=${this.currentProxy.host}:${this.currentProxy.port}`,
      );
    }
    this.browser = await puppeteer.launch({
      headless: true,
      args: args,
    });
  }
  /**
   * Function for scraping the HTML data of the retailers product page.
   * @param browser Puppeteer Browser object to perform the requests to url
   * @param url url to obtain HTML for
   * @param siteConfig SiteConfig for individual retailer site that will be scraped
   * @param interceptorConfig InterceptorConfig to provide rules for Puppeteer on what content/requests to ignore.
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
    try {
      await page.goto(url, {
        waitUntil: siteConfig?.waitUntil || "networkidle2",
      });
      await page.waitForSelector(siteConfig.selector, {
        visible: true,
        timeout: siteConfig?.timeout || 15000,
      });
      html = await page.content();
      page.close();
    } catch (err) {
      console.log(err);
      console.log(html);
    }

    return html;
  }
  closeBrowser(): void {
    this.browser?.close();
  }
}
