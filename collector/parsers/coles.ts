import * as cheerio from "cheerio";
export function parseColesPage(html: string): { name: string; price: number } {
  const htmlText = cheerio.load(html);
  const selector = 'script[type="application/ld+json"][data-next-head]';
  const jsonText = htmlText(selector).text();
  const outputJson = JSON.parse(jsonText);
  const name = outputJson.name;
  const price = Math.trunc(parseFloat(outputJson?.offers[0]?.price) * 100);
  console.log(name, price);
  return { name, price };
}
