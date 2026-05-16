import * as cheerio from "cheerio";
export function parseColesPage(html: string): { name: string; price: number } {
  const htmlText = cheerio.load(html);
  const selector = 'script[type="application/ld+json"][data-next-head]';
  const jsonText = htmlText(selector).text();
  if (!jsonText) {
    throw new Error("Coles: product data script tag not found");
  }
  const outputJson = JSON.parse(jsonText);
  const name = outputJson.name;
  const price = Math.trunc(parseFloat(outputJson?.offers[0]?.price) * 100);
  if (!price || isNaN(price))
    throw new Error("Coles: product price not found in page data");
  if (!name) throw new Error("Coles: product name not found in page data");
  console.log(name, price);
  return { name, price };
}
