import { Context } from "hono";
import { getDb } from "amplify/db";
import { usersTable } from "amplify/db/schema";
import { eq } from "drizzle-orm";
/**
 *  Function to extract the users cognitoId from the JWT claims within a AWS API Gateway request context
 * @param c : hono request context
 * @returns Cognito user ID (sub claim)
 */
export function getCognitoId(c: Context): string {
  // requestContext interface defined in hono is out of date and doesn't not have the jwt field that is required, can fix this when upstream is fixed or define own interface.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const context = c.env.event.requestContext as any;
  const cognito_userid = context.authorizer.jwt.claims["sub"]; //this claim can be trusted as already authorized by API gateway
  return cognito_userid;
}
/**
 * Function to determine the users internal id within db based on AWS API Gateway request context
 * @param c : Hono request context
 * @returns Database internal users id
 */
export async function getUserId(c: Context) {
  const db = await getDb();
  const cognitoId = getCognitoId(c);
  console.log(`getUserId: cognito_user_id=${cognitoId}`);
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.cognito_user_id, cognitoId));
  if (!user) {
    console.error(`getUserId: no DB user for cognito_user_id=${cognitoId}`);
    throw new Error(`User not found for cognito_user_id: ${cognitoId}`);
  }
  return user.id;
}
