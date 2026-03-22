import { defineFunction, secret } from "@aws-amplify/backend";

export const notificationHandler = defineFunction({
  name: "notification-handler",
  entry: "./handler.ts",
  timeoutSeconds: 900,
  environment: {
    NODE_OPTIONS: "--enable-source-maps",
    DATABASE_URL: secret("DATABASE_URL"),
    DB_SCHEMA: secret("DB_SCHEMA") || "main",
    SES_SENDER_EMAIL: secret("SES_SENDER_EMAIL"),
  },
});
