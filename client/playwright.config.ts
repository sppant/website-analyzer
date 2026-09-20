import { defineConfig, devices } from "@playwright/test";

/**
 * The SPA is served under /app (see vite.config.ts `base`) and talks to the
 * real Fastify API on :3000, which in turn needs the docker-compose Postgres
 * instance running and server/.env configured (see server/.env.example) —
 * the same setup used for normal local development.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    // Origin only (no /app) — tests navigate to "/app/..." explicitly, since
    // a leading "/" in page.goto() resolves against the origin, not baseURL's
    // path, and would otherwise drop the /app prefix.
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "npm run dev",
      cwd: import.meta.dirname,
      url: "http://localhost:5173/app/",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npm run dev",
      cwd: "../server",
      url: "http://localhost:3000/api/health",
      reuseExistingServer: !process.env.CI,
    },
  ],
});
