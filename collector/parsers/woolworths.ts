import * as cheerio from "cheerio";
export function parseWoolworthsPage(html: string): {
  name: string;
  price: number;
} {
  const htmlText = cheerio.load(html);
  const jsonText = htmlText("#__NEXT_DATA__").text();

  if (!jsonText) throw new Error("Woolworths: product data script tag not found");

  const outputJson = JSON.parse(jsonText);
  const name = outputJson?.props?.pageProps?.pdDetails?.Product?.DisplayName;
  const price = Math.trunc(
    parseFloat(outputJson?.props?.pageProps?.pdDetails?.Product?.Price) * 100,
  );

  if (!name) throw new Error("Woolworths: product name not found in page data");
  if (!price || isNaN(price)) throw new Error("Woolworths: product price not found in page data");

  console.log(`Parsed Woolworths product: ${name}, Price: ${price}`);
  return { name, price };
}
