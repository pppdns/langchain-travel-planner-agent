import * as Sentry from "@sentry/nextjs";
import { initBotId } from "botid/client/core";
import { sentryInitOptions } from "@/src/lib/sentry";

// Pairs with checkBotId() in src/lib/botid.ts: without this, production
// requests carry no BotID token and every trip API call is rejected as a bot.
initBotId({
  protect: [
    { path: "/api/trips", method: "POST" },
    { path: "/api/trips/*", method: "POST" },
    { path: "/api/trips/*/run", method: "POST" },
    { path: "/api/trips/*/images", method: "POST" },
  ],
});

Sentry.init({
  ...sentryInitOptions(),
  integrations: [
    Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] }),
    Sentry.replayIntegration({
      maskAllText: false,
      maskAllInputs: false,
      blockAllMedia: false,
    }),
  ],
  replaysSessionSampleRate: 1,
  replaysOnErrorSampleRate: 1,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
