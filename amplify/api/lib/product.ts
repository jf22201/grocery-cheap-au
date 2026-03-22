import axios from "axios";

/**
 * Scrapes rendered HTML for a product page via the Zyte API.
 *
 * @param url The target product URL to fetch.
 * @returns The decoded HTML response body.
 * @throws {Error} If Zyte configuration is missing, the request fails, or the
 * expected response payload is not present.
 */
export async function scrapeHtml(url: string) {
  const endpoint = process.env.ZYTE_API_ENDPOINT;
  const apiKey = process.env.ZYTE_API_KEY;

  if (!endpoint) {
    throw new Error("Missing required environment variable: ZYTE_API_ENDPOINT");
  }

  if (!apiKey) {
    throw new Error("Missing required environment variable: ZYTE_API_KEY");
  }

  try {
    const response = await axios.post(
      endpoint,
      {
        url,
        httpResponseBody: true,
        device: "desktop",
        followRedirect: true,
      },
      {
        auth: { username: apiKey, password: "" },
      },
    );

    const encodedBody = response.data?.httpResponseBody;
    if (!encodedBody || typeof encodedBody !== "string") {
      throw new Error("Zyte response did not contain a valid httpResponseBody");
    }

    const html = Buffer.from(encodedBody, "base64").toString("utf-8");
    return html;
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`Failed to scrape HTML for URL ${url}: ${err.message}`);
    }
    throw new Error(`Failed to scrape HTML for URL ${url}: unknown error`);
  }
}
