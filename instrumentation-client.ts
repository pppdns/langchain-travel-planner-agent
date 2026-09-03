import * as Sentry from "@sentry/nextjs";
import { sentryInitOptions } from "@/src/lib/sentry";

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
