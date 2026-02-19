import type { PostConfirmationTriggerHandler } from "aws-lambda";

export const handler: PostConfirmationTriggerHandler = (event) => {
  //extract relevant user info from trigger event
  const userid = event.request.userAttributes?.sub;
  const email = event.request.userAttributes?.email;
};
