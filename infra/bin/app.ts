import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { ApiStack } from "../lib/api-stack";
import { NotificationStack } from "../lib/notification-stack";
import { ScraperStack } from "../lib/scraper-stack";

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: "ap-southeast-2",
};

const notificationStack = new NotificationStack(app, "NotificationStack", {
  env,
});

new ApiStack(app, "ApiStack", {
  env,
});

new ScraperStack(app, "ScraperStack", {
  env,
  scraperBus: notificationStack.scraperBus,
});
