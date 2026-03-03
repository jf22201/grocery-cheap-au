import Scraper from "../scrapers/Scraper";
import { db } from "@db/index";
import { pricesTable, productsTable, vendorsTable } from "@db/schema";
import { ProxyInfo } from "../scrapers/Scraper";
import {
  colesInterceptorConfig,
  colesSiteConfig,
} from "collector/scrapers/coles";
import {
  woolworthsInterceptorConfig,
  woolworthsSiteConfig,
} from "collector/scrapers/woolworths";
import { parseColesPage } from "collector/parsers/coles";
import { parseWoolworthsPage } from "collector/parsers/woolworths";
async function main() {
  const vendors = await db.select().from(vendorsTable);
  const vendorIdSlugMap: Record<string, Number> = {};
  for (const vendor of vendors) {
    vendorIdSlugMap[vendor.vendor_slug] = vendor.id;
  }
  const allProducts = await db.select().from(productsTable);
  //get latest proxy info
  const proxyRes = await fetch(process.env.PROXY_PROVIDER_ENDPOINT as string, {
    headers: {
      Authorization: process.env.PROXY_PROVIDER_API_KEY as string,
    },
  });
  let proxyList: Array<ProxyInfo> = [];
  let proxyInfo = await proxyRes.json();
  proxyInfo = proxyInfo?.results;
  for (const proxy of proxyInfo) {
    const { proxy_address, port, username, password } = proxy;
    proxyList.push({ host: proxy_address, port, username, password });
  }
  const scraper = new Scraper(proxyList);
  await scraper.initBrowser();
  for (const product of allProducts) {
    const url = product.url;
    const vendor_id = product.vendor_id;
    const product_id = product.id;
    //select config based on vendor
    let siteConfig;
    let interceptorConfig;
    let parserFn;
    switch (vendor_id) {
      case vendorIdSlugMap["coles"]:
        siteConfig = colesSiteConfig;
        interceptorConfig = colesInterceptorConfig;
        parserFn = parseColesPage;
        break;
      case vendorIdSlugMap["woolworths"]:
        siteConfig = woolworthsSiteConfig;
        interceptorConfig = woolworthsInterceptorConfig;
        parserFn = parseWoolworthsPage;
        break;
      default:
        //TODO: figure out a better default value here or refactor Scrape.ScapePage() to allow undefined
        siteConfig = colesSiteConfig;
        interceptorConfig = colesInterceptorConfig;
        parserFn = parseColesPage;
        break;
    }
    try {
      let html = await scraper.scrapeWithRetry(
        url,
        siteConfig,
        interceptorConfig,
      );

      const { name, price } = parserFn(html);
      //create new record in DB
      await db
        .insert(pricesTable)
        .values({
          product_id: product_id,
          date_recorded: new Date().toISOString().split("T")[0], //record the current date (YYYY-MM-DD)
          price: price,
        })
        .onConflictDoUpdate({
          //If record already exists for the current day, update it
          target: [pricesTable.product_id, pricesTable.date_recorded],
          set: { price: price },
        });
    } catch (err) {
      console.log(err);
    }
  }
  await scraper.closeBrowser();
}
main();
