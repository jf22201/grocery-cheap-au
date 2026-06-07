import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as authorizers from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as path from "path";

type ApiStackProps = cdk.StackProps & { environment: string };

export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);
    const { environment } = props;
    // prod uses bare paths to preserve existing params; other envs are namespaced
    const ssmPath = (param: string) =>
      environment === "prod"
        ? `/grocery-tracker/${param}`
        : `/grocery-tracker/${environment}/${param}`;

    const dbUrl = ssm.StringParameter.fromSecureStringParameterAttributes(
      this,
      "DbUrl",
      { parameterName: "/grocery-tracker/database_url" },
    );
    const zyteApiKey = ssm.StringParameter.fromSecureStringParameterAttributes(
      this,
      "ZyteApiKey",
      { parameterName: "/grocery-tracker/zyte_api_key" },
    );
    const zyteApiEndpoint = ssm.StringParameter.fromStringParameterAttributes(
      this,
      "ZyteApiEndpoint",
      { parameterName: "/grocery-tracker/zyte_api_endpoint" },
    );

    const apiLambda = new lambdaNodejs.NodejsFunction(this, "ApiLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      projectRoot: path.join(__dirname, "../.."),
      entry: path.join(__dirname, "../../amplify/api/index.ts"),
      handler: "handler",
      timeout: cdk.Duration.seconds(29),
      environment: {
        NODE_OPTIONS: "--enable-source-maps",
        DATABASE_URL_PARAM: dbUrl.parameterName,
        ZYTE_API_KEY_PARAM: zyteApiKey.parameterName,
        ZYTE_API_ENDPOINT: zyteApiEndpoint.stringValue,
      },
    });

    dbUrl.grantRead(apiLambda);
    zyteApiKey.grantRead(apiLambda);
    zyteApiEndpoint.grantRead(apiLambda);

    const postConfirmationLambda = new lambdaNodejs.NodejsFunction(
      this,
      "PostConfirmationLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        projectRoot: path.join(__dirname, "../.."),
        entry: path.join(
          __dirname,
          "../../amplify/auth/post-confirmation/handler.ts",
        ),
        handler: "handler",
        environment: {
          NODE_OPTIONS: "--enable-source-maps",
          DATABASE_URL_PARAM: dbUrl.parameterName,
        },
      },
    );
    dbUrl.grantRead(postConfirmationLambda);

    const userPool = new cognito.UserPool(this, "UserPool", {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lambdaTriggers: {
        postConfirmation: postConfirmationLambda,
      },
    });

    const userPoolClient = new cognito.UserPoolClient(this, "UserPoolClient", {
      userPool,
      authFlows: { userPassword: true, userSrp: true },
    });

    // Write pool ID and client ID to SSM for frontend config
    new ssm.StringParameter(this, "UserPoolId", {
      parameterName: ssmPath("cognito_user_pool_id"),
      stringValue: userPool.userPoolId,
    });
    new ssm.StringParameter(this, "UserPoolClientId", {
      parameterName: ssmPath("cognito_user_pool_client_id"),
      stringValue: userPoolClient.userPoolClientId,
    });

    const httpApi = new apigatewayv2.HttpApi(this, "HttpApi", {
      apiName: "grocery-tracker-api",
      corsPreflight: {
        allowMethods: [
          apigatewayv2.CorsHttpMethod.GET,
          apigatewayv2.CorsHttpMethod.POST,
          apigatewayv2.CorsHttpMethod.PUT,
          apigatewayv2.CorsHttpMethod.DELETE,
        ],
        allowOrigins: ["*"],
        allowHeaders: ["*"],
      },
    });

    const lambdaIntegration = new integrations.HttpLambdaIntegration(
      "LambdaIntegration",
      apiLambda,
    );

    const userPoolAuthorizer = new authorizers.HttpUserPoolAuthorizer(
      "UserPoolAuthorizer",
      userPool,
      { userPoolClients: [userPoolClient] },
    );

    httpApi.addRoutes({
      path: "/comparisons",
      methods: [
        apigatewayv2.HttpMethod.GET,
        apigatewayv2.HttpMethod.POST,
        apigatewayv2.HttpMethod.PUT,
        apigatewayv2.HttpMethod.DELETE,
      ],
      integration: lambdaIntegration,
      authorizer: userPoolAuthorizer,
    });

    httpApi.addRoutes({
      path: "/test",
      methods: [
        apigatewayv2.HttpMethod.GET,
        apigatewayv2.HttpMethod.POST,
        apigatewayv2.HttpMethod.PUT,
        apigatewayv2.HttpMethod.DELETE,
      ],
      integration: lambdaIntegration,
    });

    // Write API URL to SSM so CI/CD can sync it to Vercel
    new ssm.StringParameter(this, "ApiUrl", {
      parameterName: ssmPath("api_url"),
      stringValue: httpApi.url!,
    });

    new cdk.CfnOutput(this, "ApiEndpoint", { value: httpApi.url! });
  }
}
