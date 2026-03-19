import axios from "axios";
export async function scrapeHtml(url: string) {
  try {
    const html = await axios
      .post(
        process.env.ZYTE_API_ENDPOINT as string,
        {
          url: url,
          httpResponseBody: true,
          device: "desktop",
          followRedirect: true,
        },
        {
          auth: { username: process.env.ZYTE_API_KEY as string, password: "" },
        },
      )
      .then((response) => {
        const httpResponseBody = Buffer.from(
          response.data.httpResponseBody,
          "base64",
        ).toString("utf-8");
        return httpResponseBody;
      });
    return html;
  } catch (err) {
    console.log("Error scraping url:", url, err);
    throw err;
  }
}
