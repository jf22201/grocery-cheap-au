import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { ApiStack } from "../lib/api-stack";
import { NotificationStack } from "../lib/notification-stack";
import { ScraperStack } from "../lib/scraper-stack";

const app = new cdk.App();

const environment: string = app.node.tryGetContext("environment") ?? "staging";

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: "ap-southeast-2",
};

// prod uses bare stack names to preserve existing deployed stacks
const stackId = (name: string) =>
  environment === "prod" ? name : `${environment}-${name}`;

const notificationStack = new NotificationStack(
  app,
  stackId("NotificationStack"),
  { env, environment }
);

new ApiStack(app, stackId("ApiStack"), { env, environment });

new ScraperStack(app, stackId("ScraperStack"), {
  env,
  environment,
  scraperBus: notificationStack.scraperBus,
});
