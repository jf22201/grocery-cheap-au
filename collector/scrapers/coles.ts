import { SiteConfig, InterceptorConfig } from "./Scraper";

export const colesSiteConfig: SiteConfig = {
  name: "Coles",
  selector: ".product__title",
  waitUntil: "domcontentloaded",
  timeout: 5000,
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
