import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 15_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      thresholds: { lines: 60, branches: 55, functions: 60 },
      exclude: ["css-dev-skills/**", "tests/**", "app/**/loading.tsx"]
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname)
    }
  }
});