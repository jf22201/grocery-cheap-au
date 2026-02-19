import { defineFunction, secret } from "@aws-amplify/backend";

export const postConfirmation = defineFunction({
  name: "post-confirmation",
  environment: {
    DB_SCHEMA: secret("DB_SCHEMA") || "main",
    DATABASE_URL: secret("DATABASE_URL"),
  },
  resourceGroupName: "auth",
});
