//TODO: fill out SiteConfig for woolworths
import { SiteConfig, InterceptorConfig } from "./Scraper";
export const woolworthsInterceptorConfig: InterceptorConfig = {
  blockedURL: [
    "youtube",
    "tiqcdn",
    "dc.services.visualstudio",
    "googletagmanager",
    "demdex",
    "tealiumiq",
    "kampyle",
    "doubleclick",
    "impactradius",
  ],
  blockedResources: ["image", "font", "media"],
};
export const woolworthsSiteConfig: SiteConfig = {
  name: "Woolworths",
  selector: ".wx-header__container",
  waitUntil: "domcontentloaded",
  timeout: 5000,
};
