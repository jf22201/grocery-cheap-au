import { Hono } from "hono";
import { ApiGatewayRequestContextV2, LambdaEvent } from "hono/aws-lambda";
type Bindings = {
  event: LambdaEvent;
}; //Adding AWS lambda specific bindings
export const test = new Hono<{ Bindings: Bindings }>();

test.get("/", (c) => {
  console.log("entered lambda function");
  return c.json({ message: "hello from lambda" });
});
