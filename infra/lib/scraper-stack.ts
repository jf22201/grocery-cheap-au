import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ssm from "aws-cdk-lib/aws-ssm";

interface ScraperStackProps extends cdk.StackProps {
  scraperBus: events.EventBus;
}

export class ScraperStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ScraperStackProps) {
    super(scope, id, props);

    const dbUrl = ssm.StringParameter.fromSecureStringParameterAttributes(
      this,
      "DbUrl",
      { parameterName: "/grocery-tracker/database_url" },
    );
    const proxyEndpoint = ssm.StringParameter.fromStringParameterAttributes(
      this,
      "ProxyEndpoint",
      { parameterName: "/grocery-tracker/proxy_provider_endpoint" },
    );
    const proxyApiKey = ssm.StringParameter.fromSecureStringParameterAttributes(
      this,
      "ProxyApiKey",
      { parameterName: "/grocery-tracker/proxy_provider_api_key" },
    );

    const vpc = ec2.Vpc.fromVpcAttributes(this, "Vpc", {
      vpcId: "vpc-0fe88ff24b8b096be",
      availabilityZones: ["ap-southeast-2a", "ap-southeast-2b"],
      publicSubnetIds: ["subnet-071217c6bb78011bf", "subnet-04b71d0ef82b44444"],
    });

    const cluster = ecs.Cluster.fromClusterAttributes(this, "Cluster", {
      clusterName: "default",
      vpc,
    });

    const repo = ecr.Repository.fromRepositoryName(
      this,
      "ScraperRepo",
      "grocery-tracker-nightly-scrape",
    );

    const scraperTaskRole = iam.Role.fromRoleName(
      this,
      "ScraperTaskRole",
      "grocery-tracker-nightly-scraper-role",
      { mutable: false },
    );

    const scraperTaskDef = new ecs.FargateTaskDefinition(
      this,
      "ScraperTaskDef",
      {
        taskRole: scraperTaskRole,
        executionRole: scraperTaskRole,
        memoryLimitMiB: 2048,
        cpu: 1024,
      },
    );

    scraperTaskDef.addContainer("ScraperContainer", {
      image: ecs.ContainerImage.fromEcrRepository(repo, "latest"),
      environment: {
        EVENT_BUS_NAME: props.scraperBus.eventBusName,
      },
      secrets: {
        DATABASE_URL: ecs.Secret.fromSsmParameter(dbUrl),
        PROXY_PROVIDER_ENDPOINT: ecs.Secret.fromSsmParameter(proxyEndpoint),
        PROXY_PROVIDER_API_KEY: ecs.Secret.fromSsmParameter(proxyApiKey),
      },
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: "nightly-scraper" }),
    });

    new events.Rule(this, "ScraperSchedule", {
      schedule: events.Schedule.cron({ hour: "21", minute: "30" }),
      targets: [
        new targets.EcsTask({
          cluster,
          taskDefinition: scraperTaskDef,
          subnetSelection: { subnetType: ec2.SubnetType.PUBLIC },
          assignPublicIp: true,
        }),
      ],
    });
  }
}
