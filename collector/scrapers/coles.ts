import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

import { Browser, Page } from "puppeteer";
import { SiteConfig } from "./util";

export const colesConfig: SiteConfig = {
  name: "Coles",
  selector: ".product__title",
};
