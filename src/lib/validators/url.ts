/**
 * Validates and normalises a product URL for a supported vendor.
 *
 * - Ensures the URL has a protocol (defaults to `https://` if omitted).
 * - Ensures the hostname matches the expected vendor hostname.
 * - Ensures the pathname matches the expected vendor product path format.
 * - Returns a canonical URL with protocol + hostname + pathname only.
 *
 * @param inputUrl Raw product URL from user input.
 * @param vendor_slug Vendor identifier (currently `woolworths` or `coles`).
 * @returns A normalised product URL.
 * @throws {Error} If the vendor slug is unsupported, the URL is invalid, the
 * hostname does not match the vendor, or the path is not a valid product path.
 */
export function validateAndNormaliseUrl(
  inputUrl: string,
  vendor_slug: string,
): string {
  const urlWithProtocol = inputUrl.startsWith("http")
    ? inputUrl
    : `https://${inputUrl}`;
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlWithProtocol);
  } catch {
    throw new Error(`Invalid URL format: ${inputUrl}`);
  }

  let vendorHostname: string;
  let vendorProductPathRegex: RegExp;

  switch (vendor_slug) {
    case "woolworths":
      vendorHostname = woolworthsHostname;
      vendorProductPathRegex = woolworthsProductPathRegex;
      break;
    case "coles":
      vendorHostname = colesHostname;
      vendorProductPathRegex = colesProductPathRegex;
      break;
    default:
      throw new Error(`Invalid vendor slug: ${vendor_slug}`);
  }

  const hostname = parsedUrl.hostname.startsWith("www.")
    ? parsedUrl.hostname
    : `www.${parsedUrl.hostname}`;

  if (hostname !== vendorHostname) {
    throw new Error(
      `Invalid hostname for ${vendor_slug}. Expected ${vendorHostname}, got ${hostname}`,
    );
  }

  if (!vendorProductPathRegex.test(parsedUrl.pathname)) {
    throw new Error(
      `Invalid product path for ${vendor_slug}: ${parsedUrl.pathname}`,
    );
  }

  return parsedUrl.protocol + "//" + hostname + parsedUrl.pathname;
}

/**
 * Extracts a vendor-specific product ID from a validated product URL.
 *
 * @param url Product URL (ideally already validated/normalised).
 * @param vendor_slug Vendor identifier (currently `woolworths` or `coles`).
 * @returns The extracted product ID as a string.
 * @throws {Error} If the vendor slug is unsupported or no product ID can be
 * extracted from the URL for the selected vendor pattern.
 */
export function extractProductIdFromUrl(
  url: string,
  vendor_slug: string,
): string {
  let productIdRegex: RegExp;
  switch (vendor_slug) {
    case "woolworths":
      productIdRegex = woolworthsProductIdRegex;
      break;
    case "coles":
      productIdRegex = colesProductIdRegex;
      break;
    default:
      throw new Error(`Invalid vendor slug: ${vendor_slug}`);
  }
  const match = url.match(productIdRegex);
  if (!match || !match[1]) {
    throw new Error(
      `Could not extract product ID for ${vendor_slug} from URL: ${url}`,
    );
  }
  return match[1]; //return just the productId
}
export const colesProductPathRegex = /^\/product\/\S+\d{7}$/;
export const woolworthsProductPathRegex =
  /^\/shop\/productdetails\/\d{6}\/\S+$/;
export const woolworthsHostname = "www.woolworths.com.au";
export const colesHostname = "www.coles.com.au";
const colesProductIdRegex = /(\d{7})$/;
const woolworthsProductIdRegex = /productdetails\/(\d{6})/;
