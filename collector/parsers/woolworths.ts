import * as cheerio from "cheerio";
export function parseWoolworthsPage(html: string) {
  const htmlText = cheerio.load(html);
  const jsonText = htmlText("#__NEXT_DATA__").text();
  const outputJson = JSON.parse(jsonText);
  const name = outputJson?.props?.pageProps?.pdDetails?.Product?.DisplayName;
  const price = outputJson?.props?.pageProps?.pdDetails?.Product?.Price;
  console.log(name, price);
}
