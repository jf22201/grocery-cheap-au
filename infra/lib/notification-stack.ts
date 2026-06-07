import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as path from "path";
import { makeSsmPath } from "./utils";

type NotificationStackProps = cdk.StackProps & { environment: string };

export class NotificationStack extends cdk.Stack {
  public readonly scraperBus: events.EventBus;

  constructor(scope: Construct, id: string, props: NotificationStackProps) {
    super(scope, id, props);
    // ssmPath("foo") => /grocery-tracker/{env}/foo, or /grocery-tracker/foo in prod
    const ssmPath = makeSsmPath(props.environment);

    const dbUrl = ssm.StringParameter.fromSecureStringParameterAttributes(
      this,
      "DbUrl",
      { parameterName: ssmPath("database_url") },
    );
    const sesSenderEmail = ssm.StringParameter.fromStringParameterAttributes(
      this,
      "SesSenderEmail",
      { parameterName: "/grocery-tracker/ses_sender_email" },
    );

    const notificationLambda = new lambdaNodejs.NodejsFunction(
      this,
      "NotificationLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        projectRoot: path.join(__dirname, "../.."),
        entry: path.join(
          __dirname,
          "../../amplify/notificationHandler/handler.ts",
        ),
        handler: "handler",
        timeout: cdk.Duration.seconds(900),
        environment: {
          NODE_OPTIONS: "--enable-source-maps",
          DATABASE_URL_PARAM: dbUrl.parameterName,
          SES_SENDER_EMAIL: sesSenderEmail.stringValue,
        },
      },
    );

    dbUrl.grantRead(notificationLambda);
    sesSenderEmail.grantRead(notificationLambda);

    notificationLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ses:SendEmail"],
        resources: ["*"],
      }),
    );

    this.scraperBus = new events.EventBus(this, "ScraperBus");

    new events.Rule(this, "ScrapeCompleteRule", {
      eventBus: this.scraperBus,
      eventPattern: {
        source: ["grocery-tracker.scraper"],
        detailType: ["ScrapeComplete"],
      },
      targets: [new targets.LambdaFunction(notificationLambda)],
    });
  }
}
