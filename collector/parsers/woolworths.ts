import * as cheerio from "cheerio";
export function parseWoolworthsPage(html: string): {
  name: string;
  price: number;
} {
  const htmlText = cheerio.load(html);
  const jsonText = htmlText("#__NEXT_DATA__").text();
  const outputJson = JSON.parse(jsonText);
  const name = outputJson?.props?.pageProps?.pdDetails?.Product?.DisplayName;
  const price = Math.trunc(
    parseFloat(outputJson?.props?.pageProps?.pdDetails?.Product?.Price) * 100,
  );
  console.log(name, price);
  return { name, price };
}
