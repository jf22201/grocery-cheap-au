import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const ssm = new SSMClient({ region: "ap-southeast-2" });

async function resolveSecureParam(
  directEnvVar: string,
  paramNameEnvVar: string,
): Promise<string> {
  const direct = process.env[directEnvVar];
  if (direct) return direct;

  const paramName = process.env[paramNameEnvVar];
  if (!paramName)
    throw new Error(`Neither ${directEnvVar} nor ${paramNameEnvVar} is set`);

  const { Parameter } = await ssm.send(
    new GetParameterCommand({ Name: paramName, WithDecryption: true }),
  );
  return Parameter!.Value!;
}

let _db: ReturnType<typeof drizzle> | undefined;

export async function getDb() {
  if (_db) return _db; //if _db has been cached from a previous warm state no need to re-init
  const url = await resolveSecureParam("DATABASE_URL", "DATABASE_URL_PARAM");
  _db = drizzle(url);
  return _db;
}
