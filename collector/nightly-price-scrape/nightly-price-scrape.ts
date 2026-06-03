import Scraper from "../scrapers/Scraper";
import { getDb } from "../../amplify/db/index"; //NOTE : relative paths used here for docker compatibility.
import {
  pricesTable,
  productsTable,
  vendorsTable,
  latestPricesTable,
} from "../../amplify/db/schema"; //NOTE : relative paths used here for docker compatibility.
import { ProxyInfo } from "../scrapers/Scraper";
import { colesInterceptorConfig, colesSiteConfig } from "../scrapers/coles";
import {
  woolworthsInterceptorConfig,
  woolworthsSiteConfig,
} from "../scrapers/woolworths";
import { parseColesPage } from "../parsers/coles";
import { parseWoolworthsPage } from "../parsers/woolworths";
import { eq } from "drizzle-orm";
import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
async function main() {
  const db = await getDb();
  const allProducts = await db
    .select()
    .from(productsTable)
    .innerJoin(vendorsTable, eq(productsTable.vendor_id, vendorsTable.id));
  //create an in memory map of the latest prices for each product
  const latestPrices = await db.select().from(latestPricesTable);
  const latestPricesMap = new Map<number, number>();
  for (const priceRecord of latestPrices) {
    latestPricesMap.set(priceRecord.product_id, priceRecord.price);
  }
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
  let changedProductIds: number[] = [];
  const scraper = new Scraper(proxyList);
  await scraper.initBrowser();
  for (const product of allProducts) {
    const url = product.products.url;
    const vendor_slug = product.vendors.vendor_slug;
    const product_id = product.products.id;
    console.log(
      `Scraping product_id: ${product_id}, url: ${url}, vendor: ${vendor_slug}`,
    );
    //select config based on vendor
    let siteConfig;
    let interceptorConfig;
    let parserFn;
    switch (vendor_slug) {
      case "coles":
        siteConfig = colesSiteConfig;
        interceptorConfig = colesInterceptorConfig;
        parserFn = parseColesPage;
        break;
      case "woolworths":
        siteConfig = woolworthsSiteConfig;
        interceptorConfig = woolworthsInterceptorConfig;
        parserFn = parseWoolworthsPage;
        break;
      default:
        //TODO: figure out a better default value here or refactor Scrape.ScapePage() to allow undefined
        console.warn(
          `Not supported vendor for vendor_slug: ${vendor_slug}, defaulting to coles config`,
        );
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
      //check if price has changed since last scrape - if so we need to add to changedProductIds
      const lastRecordedPrice = latestPricesMap.get(product_id);
      if (!lastRecordedPrice || lastRecordedPrice !== price) {
        console.log(
          `Product_id: ${product_id} price has changed from ${lastRecordedPrice} to ${price}, adding to changedProductIds list`,
        );
        changedProductIds.push(product_id);
      }

      //create new price record in prices and latest prices table
      await db.transaction(async (tx) => {
        Promise.all([
          await tx
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
            }),
          await tx
            .insert(latestPricesTable)
            .values({
              product_id,
              price,
              date_recorded: new Date().toISOString().split("T")[0],
            })
            .onConflictDoUpdate({
              target: latestPricesTable.product_id,
              set: {
                price,
                date_recorded: new Date().toISOString().split("T")[0],
              },
            }),
        ]);
      });

      console.log(
        `Successfully recorded price for product_id: ${product_id}, price: ${price}, date: ${new Date().toISOString().split("T")[0]}`,
      );
    } catch (err) {
      console.error(err);
    }
  }
  console.log("Finished scraping all products, closing scraper");
  //send eventbridge event with changed product ids for notification handler to process
  if (changedProductIds.length > 0) {
    console.log(
      `Price changes detected for ${changedProductIds.length} product(s), publishing ScrapeComplete event to EventBridge`,
    );
    const eventBridge = new EventBridgeClient({ region: "ap-southeast-2" });

    await eventBridge.send(
      new PutEventsCommand({
        Entries: [
          {
            EventBusName: process.env.EVENT_BUS_NAME,
            Source: "grocery-tracker.scraper",
            DetailType: "ScrapeComplete",
            Detail: JSON.stringify({ changedProductIds }),
          },
        ],
      }),
    );
    console.log("ScrapeComplete event published successfully");
  } else {
    console.log("No price changes detected, skipping EventBridge event");
  }
  process.exit(0);
}
main();
