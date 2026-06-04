import { LambdaEvent } from "hono/aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";
const logger = new Logger({ serviceName: "grocery-tracker-api" });
type Bindings = {
  event: LambdaEvent;
}; //Adding AWS lambda specific bindings
export function getRequestContext(c: {
  env: Bindings;
  req: {
    method: string;
    path: string;
    header: (name: string) => string | undefined;
  };
}) {
  const requestContext = (
    c.env.event as unknown as { requestContext?: Record<string, unknown> }
  ).requestContext as
    | {
        requestId?: string;
        stage?: string;
        http?: { sourceIp?: string; userAgent?: string };
        identity?: { sourceIp?: string; userAgent?: string };
      }
    | undefined;

  return {
    requestId: requestContext?.requestId ?? "unknown",
    method: c.req.method,
    path: c.req.path,
    stage: requestContext?.stage,
    sourceIp:
      requestContext?.http?.sourceIp ?? requestContext?.identity?.sourceIp,
    userAgent:
      requestContext?.http?.userAgent ??
      requestContext?.identity?.userAgent ??
      c.req.header("user-agent"),
  };
}

export function logEndpointError(
  message: string,
  err: unknown,
  requestId: string,
) {
  logger.error(message, {
    requestId,
    error: err instanceof Error ? err.message : String(err),
    cause: err instanceof Error && err.cause ? String(err.cause) : undefined,
    stack: err instanceof Error ? err.stack : undefined,
  });
}
