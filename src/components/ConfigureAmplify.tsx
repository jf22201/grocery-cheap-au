import { Amplify } from "aws-amplify";
import { parseAmplifyConfig } from "aws-amplify/utils";
import outputs from "@/../amplify_outputs.json";
import { fetchAuthSession } from "aws-amplify/auth";
import { Authorization } from "aws-cdk-lib/aws-events";
export default async function ConfigureAmplify() {
  Amplify.configure(outputs); //Need to do this initial configuration otherwise fetchAuthSession will fail.
  const amplifyConfig = parseAmplifyConfig(outputs);
  //get auth session details to fill out the Auth header.
  let auth;
  try {
    auth = await fetchAuthSession();
  } catch (err) {
    auth = null;
  }
  const authToken = auth?.tokens?.idToken?.toString();

  Amplify.configure(
    {
      ...amplifyConfig,
      API: {
        ...amplifyConfig.API,
        REST: outputs.custom.API, // ← Required for custom REST APIs
      },
    },
    {
      API: {
        REST: {
          retryStrategy: {
            strategy: "no-retry", // Overrides default retry strategy
          },
          headers: async () => {
            return authToken
              ? { Authorization: authToken }
              : ({} as Record<string, string>);
          },
        },
      },
    },
  );
}
