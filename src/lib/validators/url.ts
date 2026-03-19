export function validateAndNormaliseUrl(
  inputUrl: string,
  vendor_slug: string,
): string | undefined {
  const urlWithProtocol = inputUrl.startsWith("http")
    ? inputUrl
    : `https://${inputUrl}`;
  try {
    let vendorHostname;
    let vendorProductPathRegex;
    const parsedUrl = new URL(urlWithProtocol);
    //if the hostname doesn't have www. add it
    const hostname = parsedUrl.hostname.startsWith("www.")
      ? parsedUrl.hostname
      : `www.${parsedUrl.hostname}`;
    //select regex and hostname to compare with.
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
        throw new Error("invalid vendor slug!");
    }
    if (hostname !== vendorHostname) {
      console.log("inputhostname fail");
      throw new Error();
      //check if the path matches expected pattern of a product
    } else if (!vendorProductPathRegex.test(parsedUrl.pathname)) {
      console.log("product path fail");
      throw new Error();
    }
    return parsedUrl.protocol + "//" + hostname + parsedUrl.pathname;
  } catch (err) {
    if (err instanceof Error && err.message == "invalid vendor slug!") {
      throw new Error("invalid vendor slug!"); //TODO: perhaps need to update this exec
    } else {
      return "";
    }
  }
}

export function extractProductIdFromUrl(
  url: string,
  vendor_slug: string,
): string {
  let productIdRegex;
  switch (vendor_slug) {
    case "woolworths":
      productIdRegex = woolworthsProductIdRegex;
      break;
    case "coles":
      productIdRegex = colesProductIdRegex;
      break;
    default:
      throw new Error("Invalid vendor slug");
  }
  const match = url.match(productIdRegex);
  if (!match)
    throw new Error(
      `Could not extract product ID from URL: ${url}, vendor: ${vendor_slug}`,
    );
  return match[1]; //return just the productId
}
export const colesProductPathRegex = /^\/product\/\S+\d{7}$/;
export const woolworthsProductPathRegex =
  /^\/shop\/productdetails\/\d{6}\/\S+$/;
export const woolworthsHostname = "www.woolworths.com.au";
export const colesHostname = "www.coles.com.au";
const colesProductIdRegex = /(\d{7})$/;
const woolworthsProductIdRegex = /productdetails\/(\d{6})/;
