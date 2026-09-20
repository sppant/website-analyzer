import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Only run the TypeScript sources. Without this, a stale compiled build in
    // dist/ (produced by `npm run build`) would be discovered as a duplicate
    // test suite, because Vitest's default exclude list does not cover dist/.
    include: ["src/**/*.{test,spec}.ts"],
  },
});
