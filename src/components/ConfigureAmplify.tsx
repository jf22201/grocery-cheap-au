import { Amplify } from "aws-amplify";
import { parseAmplifyConfig } from "aws-amplify/utils";
import { fetchAuthSession, getCurrentUser } from "aws-amplify/auth";
//TODO: remove the below typecheck ignore once gh actions is able to pull amplify_outputs.
// @ts-ignore
import outputs from "@/../amplify_outputs.json";

export default function ConfigureAmplify() {
  const amplifyConfig = parseAmplifyConfig(outputs);

  Amplify.configure(
    {
      ...amplifyConfig,
      API: {
        ...amplifyConfig.API,
        REST: outputs.custom.API,
      },
    },
    {
      API: {
        REST: {
          retryStrategy: {
            strategy: "no-retry",
          },
          headers: async () => {
            const headers: Record<string, string> = {};

            try {
              await getCurrentUser();
              const auth = await fetchAuthSession();
              const authToken =
                auth.tokens?.accessToken?.toString() ||
                auth.tokens?.idToken?.toString();

              if (authToken) {
                headers.Authorization = authToken;
              }
            } catch {
              //getCurrentUser will throw if there is no user.
              return headers;
            }

            return headers;
          },
        },
      },
    },
  );
}
