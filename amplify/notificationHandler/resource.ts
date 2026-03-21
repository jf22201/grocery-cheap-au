import { defineFunction } from "@aws-amplify/backend";

export const notificationHandler = defineFunction({
  name: "notification-handler",
  entry: "./handler.ts",
  timeoutSeconds: 900,
});
