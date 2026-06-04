import type { PostConfirmationTriggerHandler } from "aws-lambda";
import { getDb } from "../../db/index";
import { usersTable } from "../../db/schema";
import { sql } from "drizzle-orm";
export const handler: PostConfirmationTriggerHandler = async (event) => {
  const db = await getDb();
  console.log("Running account post confirm handler...");
  const userId = event.request.userAttributes?.sub;
  const email = event.request.userAttributes?.email;
  try {
    await db.insert(usersTable).values({
      cognito_user_id: userId,
      email,
    });
  } catch (err) {
    console.error(err);
  }
  console.log(`Added ${userId}, ${email} to database`);
  return event;
};
