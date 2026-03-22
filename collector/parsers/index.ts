import { parseColesPage } from "./coles";
import { parseWoolworthsPage } from "./woolworths";

/**
 * Returns the appropriate price parser function for a given vendor
 * @param vendor_slug - vendor identifier i.e 'coles','woolworths'
 * @returns a parser function that will extract product name and price from html.
 */
export function getParser(
  vendor_slug: string,
): (html: string) => { name: string; price: number } {
  const parsers: Record<
    string,
    (html: string) => { name: string; price: number }
  > = {
    woolworths: parseWoolworthsPage,
    coles: parseColesPage,
    //NOTE: whenever a new vendor parser is created, need to insert its record here.
  };
  const parser = parsers[vendor_slug];
  if (!parser) {
    throw new Error(`No parser found for ${vendor_slug}`);
  }
  return parser;
}
