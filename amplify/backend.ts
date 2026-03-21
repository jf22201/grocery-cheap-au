import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { api } from "./api/resource";
import { notificationHandler } from "./notificationHandler/resource";
import { Stack } from "aws-cdk-lib";
import {
  CorsHttpMethod,
  HttpApi,
  HttpMethod,
} from "aws-cdk-lib/aws-apigatewayv2";
import {
  HttpIamAuthorizer,
  HttpUserPoolAuthorizer,
} from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { EventBus, Rule } from "aws-cdk-lib/aws-events";
// import { Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";
// import { data } from './data/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  api,
  notificationHandler,
});

const apiStack = backend.createStack("api-stack");

const iamAuthorizer = new HttpIamAuthorizer();

const userPoolAuthorizer = new HttpUserPoolAuthorizer(
  "userPoolAuth",
  backend.auth.resources.userPool,
  {
    userPoolClients: [backend.auth.resources.userPoolClient],
  },
);

const httpLambdaIntegration = new HttpLambdaIntegration(
  "LambdaIntegration",
  backend.api.resources.lambda,
);

const httpApi = new HttpApi(apiStack, "HttpApi", {
  apiName: "grocery-tracker-api",
  corsPreflight: {
    // Modify the CORS settings below to match your specific requirements
    allowMethods: [
      CorsHttpMethod.GET,
      CorsHttpMethod.POST,
      CorsHttpMethod.PUT,
      CorsHttpMethod.DELETE,
    ],
    // Restrict this to domains you trust
    allowOrigins: ["*"],
    // Specify only the headers you need to allow
    allowHeaders: ["*"],
  },
  createDefaultStage: true,
});

//protected routes
httpApi.addRoutes({
  path: "/comparisons",
  methods: [HttpMethod.POST, HttpMethod.PUT, HttpMethod.DELETE, HttpMethod.GET],
  integration: httpLambdaIntegration,
  authorizer: userPoolAuthorizer,
});

//unprotected route for test
httpApi.addRoutes({
  path: "/test",
  methods: [HttpMethod.POST, HttpMethod.PUT, HttpMethod.DELETE, HttpMethod.GET],
  integration: httpLambdaIntegration,
  // authorizer: userPoolAuthorizer, //No auth required
});

backend.addOutput({
  custom: {
    API: {
      [httpApi.httpApiName!]: {
        endpoint: httpApi.url,
        region: Stack.of(httpApi).region,
        apiName: httpApi.httpApiName,
      },
    },
  },
});

//event stack for handling price change notifications
const eventStack = backend.createStack("event-stack");

const scraperBus = new EventBus(eventStack, "ScraperBus", {
  eventBusName: "grocery-tracker-scraper-bus",
});
const notificationLambda = backend.notificationHandler.resources.lambda;

new Rule(eventStack, "ScrapeCompleteRule", {
  eventBus: scraperBus,
  eventPattern: {
    source: ["grocery-tracker.scraper"],
    detailType: ["ScrapeComplete"],
  },
  targets: [new LambdaFunction(notificationLambda)],
});
