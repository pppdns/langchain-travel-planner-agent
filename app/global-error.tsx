"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import "./globals.css";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-full bg-background text-text antialiased">
        <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6">
          <title>Something went wrong</title>
          <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
          <p className="text-muted">The planner hit an unexpected error. You can try again.</p>
          <button
            type="button"
            onClick={() => retry()}
            className="w-fit rounded-full bg-accent px-4 py-2 text-sm font-medium text-ink"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
