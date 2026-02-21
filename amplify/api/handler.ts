import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import app from "./app";
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  // your function code goes here
  console.log(event);
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*", //TODO: restrict this later when in prod
      "Access-Control-Allow-Headers": "*",
    },
    body: JSON.stringify("hello from api"),
  };
};
