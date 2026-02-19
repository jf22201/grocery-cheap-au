import type { PostConfirmationTriggerHandler } from "aws-lambda";
import { db } from "@/amplify/index";
export const handler: PostConfirmationTriggerHandler = (event) => {
  //extract relevant user info from trigger event
  const userid = event.request.userAttributes?.sub;
  const email = event.request.userAttributes?.email;
};
