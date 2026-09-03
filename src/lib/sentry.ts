export function isSentryEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.PLAYWRIGHT === "1" || env.VITEST === "true" || env.NODE_ENV === "test") {
    return false;
  }
  if (env.NODE_ENV !== "production") {
    return false;
  }
  const vercelEnv = env.VERCEL_ENV ?? env.NEXT_PUBLIC_VERCEL_ENV;
  if (vercelEnv && vercelEnv !== "production") {
    return false;
  }
  return Boolean(env.SENTRY_DSN);
}

export function sentryInitOptions(env: NodeJS.ProcessEnv = process.env) {
  return {
    dsn: env.SENTRY_DSN,
    enabled: isSentryEnabled(env),
    environment: env.VERCEL_ENV ?? env.NEXT_PUBLIC_VERCEL_ENV ?? env.NODE_ENV ?? "development",
    enableLogs: true,
    tracesSampleRate: 1,
    sendDefaultPii: true,
  };
}
