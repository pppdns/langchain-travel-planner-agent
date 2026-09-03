import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import { withBotId } from "botid/next/config";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  serverExternalPackages: ["pg", "sharp"],
  env: {
    SENTRY_DSN: process.env.SENTRY_DSN ?? "",
  },
};

export default withSentryConfig(withBotId(nextConfig), {
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/sentry-tunnel",
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});
