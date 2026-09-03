import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    exclude: ["**/node_modules/**", "**/e2e/**", "**/.next/**"],
    env: {
      ROUTE_STATE_RUNTIME: "fake",
      VITEST: "true",
    },
  },
});
