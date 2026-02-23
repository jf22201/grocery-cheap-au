import { Hono } from "hono";
import { LambdaEvent } from "hono/aws-lambda";
// import { db } from "../../../db";
import { db } from "amplify/db";
import { comparisonGroupsTable, usersTable } from "amplify/db/schema";
import { eq } from "drizzle-orm";
type Bindings = {
  event: LambdaEvent;
}; //Adding AWS lambda specific bindings
export const comparisons = new Hono<{ Bindings: Bindings }>();

comparisons.get("/", async (c) => {
  // requestContext interface defined in hono is out of date and doesn't not have the jwt field that is required, can fix this when upstream is fixed or define own interface.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const context = c.env.event.requestContext as any;
  const cognito_userid = context.authorizer.jwt.claims["cognito:username"]; //this claim can be trusted as already authorized by API gateway
  const result = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.userId, cognito_userid));
  return c.json({ message: result });
});
