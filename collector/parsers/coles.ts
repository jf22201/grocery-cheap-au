import * as cheerio from "cheerio";
function parseColesPage(html: string) {
  const htmlText = cheerio.load(html);
  const selector = 'script[type="application/ld+json"][data-next-head]';
  const jsonText = htmlText(selector).text();
  const outputJson = JSON.parse(jsonText);
  const name = outputJson.name;
  const price = outputJson?.offers[0]?.price;
  console.log(name, price);
}
