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
import { LambdaFunction, EcsTask } from "aws-cdk-lib/aws-events-targets";
import { EventBus, Rule, Schedule } from "aws-cdk-lib/aws-events";
import { PolicyStatement, Role } from "aws-cdk-lib/aws-iam";
import { Vpc, SubnetType } from "aws-cdk-lib/aws-ec2";
import {
  Cluster,
  FargateTaskDefinition,
  ContainerImage,
  LogDrivers,
  Secret as EcsSecret,
} from "aws-cdk-lib/aws-ecs";
import { Repository } from "aws-cdk-lib/aws-ecr";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
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

const scraperBus = new EventBus(eventStack, "ScraperBus");
const notificationLambda = backend.notificationHandler.resources.lambda;

new Rule(eventStack, "ScrapeCompleteRule", {
  eventBus: scraperBus,
  eventPattern: {
    source: ["grocery-tracker.scraper"],
    detailType: ["ScrapeComplete"],
  },
  targets: [new LambdaFunction(notificationLambda)],
});

notificationLambda.addToRolePolicy(
  new PolicyStatement({
    actions: ["ses:SendEmail"],
    resources: ["*"],
  }),
);

// scraper stack — ECS Fargate task for nightly price scraping
const scraperStack = backend.createStack("scraper-stack");

const branch = process.env.AWS_BRANCH ?? "dev";
//in sandbox use the supplied DB_SCHEMA env, on deployed build just use branch name as schema
const dbSchema = process.env.DB_SCHEMA ?? (branch === "main" ? "main" : branch);
//all deployments should use this VPC and subnets
const vpc = Vpc.fromVpcAttributes(scraperStack, "Vpc", {
  vpcId: "vpc-0fe88ff24b8b096be",
  availabilityZones: ["ap-southeast-2a", "ap-southeast-2b"],
  publicSubnetIds: ["subnet-071217c6bb78011bf", "subnet-04b71d0ef82b44444"],
});
const cluster = Cluster.fromClusterAttributes(scraperStack, "Cluster", {
  clusterName: "default",
  vpc,
});
const repo = Repository.fromRepositoryName(
  scraperStack,
  "ScraperRepo",
  "grocery-tracker-nightly-scrape",
);

const dbUrl = StringParameter.fromSecureStringParameterAttributes(
  scraperStack,
  "DbUrl",
  { parameterName: "/grocery-tracker/database_url" },
);
const proxyEndpoint = StringParameter.fromStringParameterAttributes(
  scraperStack,
  "ProxyEndpoint",
  { parameterName: "/grocery-tracker/proxy_provider_endpoint" },
);
const proxyApiKey = StringParameter.fromSecureStringParameterAttributes(
  scraperStack,
  "ProxyApiKey",
  { parameterName: "/grocery-tracker/proxy_provider_api_key" },
);

const scraperTaskRole = Role.fromRoleName(
  scraperStack,
  "ScraperTaskRole",
  "grocery-tracker-nightly-scraper-role",
);

const scraperTaskDef = new FargateTaskDefinition(
  scraperStack,
  "ScraperTaskDef",
  {
    taskRole: scraperTaskRole,
    executionRole: scraperTaskRole,
    memoryLimitMiB: 2048,
    cpu: 1024,
  },
);
scraperTaskDef.addContainer("ScraperContainer", {
  image: ContainerImage.fromEcrRepository(repo, "latest"),
  environment: {
    EVENT_BUS_NAME: scraperBus.eventBusName,
    DB_SCHEMA: dbSchema,
  },
  secrets: {
    DATABASE_URL: EcsSecret.fromSsmParameter(dbUrl),
    PROXY_PROVIDER_ENDPOINT: EcsSecret.fromSsmParameter(proxyEndpoint),
    PROXY_PROVIDER_API_KEY: EcsSecret.fromSsmParameter(proxyApiKey),
  },
  logging: LogDrivers.awsLogs({ streamPrefix: "nightly-scraper" }),
});

// EventBridge scheduled rule - triggers scraper each morning
new Rule(scraperStack, "ScraperSchedule", {
  schedule: Schedule.cron({ hour: "21", minute: "30" }),
  targets: [
    new EcsTask({
      cluster,
      taskDefinition: scraperTaskDef,
      subnetSelection: { subnetType: SubnetType.PUBLIC },
      assignPublicIp: true,
    }),
  ],
});
