// Returns a function that resolves SSM param paths for the given environment.
// Prod uses bare paths (/grocery-tracker/param) to preserve existing params;
// other envs are namespaced (/grocery-tracker/{env}/param).
export const makeSsmPath =
  (environment: string) =>
  (param: string): string =>
    environment === "prod"
      ? `/grocery-tracker/${param}`
      : `/grocery-tracker/${environment}/${param}`;
