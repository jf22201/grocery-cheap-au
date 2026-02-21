import { Hono } from "hono";
import { cors } from "hono/cors";
import { handle } from "hono/aws-lambda";
import { test, comparisons } from "./routes";

const app = new Hono();
app.use(
  "/*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);
app.route("/test", test);
app.route("/comparisons", comparisons);
export const handler = handle(app); //this is the exported handler for the lambda function
