import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

import { Browser, Page } from "puppeteer";
import { viewports, initBrowser, scrapePage, SiteConfig } from "./util";

const colesConfig: SiteConfig = {
  name: "Coles",
  selector: ".product__title",
};
