import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

import { Browser, Page } from "puppeteer";
import { SiteConfig, InterceptorConfig } from "./Scraper";

export const colesSiteConfig: SiteConfig = {
  name: "Coles",
  selector: ".product__title",
  waitUntil: "domcontentloaded",
};

export const colesInterceptorConfig: InterceptorConfig = {
  blockedURL: [
    "youtube",
    "sentry.io",
    "citrusad",
    "bazaarvoice",
    "demdex",
    "oracleinfinity",
    "kampyle",
    "doubleclick",
    "facebook",
    "fullstory",
    "decibelinsight",
  ],
  blockedResources: ["image", "font", "media"],
};
