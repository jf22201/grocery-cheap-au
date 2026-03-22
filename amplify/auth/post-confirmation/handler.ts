import type { PostConfirmationTriggerHandler } from "aws-lambda";
import { db } from "../../db/index";
import { usersTable } from "../../db/schema";
export const handler: PostConfirmationTriggerHandler = async (event) => {
  //extract relevant user info from trigger event
  console.log("Running account post confirm handler...");
  const userId = event.request.userAttributes?.sub;
  const email = event.request.userAttributes?.email;
  //insert record into db
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
