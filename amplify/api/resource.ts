import { defineFunction, secret } from "@aws-amplify/backend";

export const api = defineFunction({
  // optionally specify a name for the Function (defaults to directory name)
  name: "api",
  environment: {
    NODE_OPTIONS: "--enable-source-maps", //enable source maps for better error stack traces
    DB_SCHEMA: secret("DB_SCHEMA") || "main",
    DATABASE_URL: secret("DATABASE_URL"),
    ZYTE_API_KEY: secret("ZYTE_API_KEY"),
    ZYTE_API_ENDPOINT: secret("ZYTE_API_ENDPOINT"),
  },
  // optionally specify a path to your handler (defaults to "./handler.ts")
  entry: "./index.ts",
  timeoutSeconds: 29,
});
