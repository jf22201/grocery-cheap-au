import { parseColesPage } from "./coles";
import { parseWoolworthsPage } from "./woolworths";

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
  return parsers[vendor_slug];
}
