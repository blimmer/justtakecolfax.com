import { defineConfig, devices } from "@playwright/test";

const CI = !!process.env["CI"];
// Not 4321, so tests never reuse a running dev server, which has no CSP.
const BASE_URL = "http://localhost:4399";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  reporter: CI
    ? [["github"], ["html", { open: "never" }]]
    : [["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  // Serves the built site so tests see the production CSP. Run `pnpm build` first.
  webServer: {
    command: "pnpm preview --port 4399 --ignore-lock",
    url: BASE_URL,
    reuseExistingServer: !CI,
  },
  projects: [
    // Fetches files over HTTP without a browser, so it runs once.
    { name: "generated files", testMatch: "generated-files.test.ts" },
    ...[
      { name: "chromium", use: { ...devices["Desktop Chrome"] } },
      { name: "firefox", use: { ...devices["Desktop Firefox"] } },
      { name: "webkit", use: { ...devices["Desktop Safari"] } },
      { name: "Mobile Chrome", use: { ...devices["Pixel 7"] } },
      { name: "Mobile Safari", use: { ...devices["iPhone 15 Pro"] } },
    ].map((project) => ({
      ...project,
      testIgnore: "generated-files.test.ts",
    })),
  ],
});
