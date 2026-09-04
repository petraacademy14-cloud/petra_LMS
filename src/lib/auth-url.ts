type AuthEnvironment = Record<string, string | undefined>;

function httpsHost(value: string | undefined) {
  if (!value) return undefined;
  return value.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function betterAuthBaseURL(environment: AuthEnvironment) {
  const deploymentHost = httpsHost(environment.VERCEL_URL);
  const branchHost = httpsHost(environment.VERCEL_BRANCH_URL);
  const productionHost = httpsHost(environment.VERCEL_PROJECT_PRODUCTION_URL);
  const allowedHosts = Array.from(
    new Set([deploymentHost, branchHost, productionHost].filter(Boolean)),
  ) as string[];

  if (allowedHosts.length) {
    return {
      allowedHosts,
      fallback: `https://${deploymentHost ?? branchHost ?? productionHost}`,
      protocol: "https" as const,
    };
  }

  return environment.BETTER_AUTH_URL;
}
