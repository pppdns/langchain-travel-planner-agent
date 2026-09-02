import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  use: {
    baseURL: "http://localhost:3000",
    extraHTTPHeaders: {
      "x-playwright": "1",
    },
  },
  webServer: {
    command: "PLAYWRIGHT=1 pnpm dev --port 3000",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
