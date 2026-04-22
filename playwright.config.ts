import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    viewport: { width: 375, height: 812 },
  },
  projects: [
    {
      name: "chromium-mobile",
      use: {
        ...devices["iPhone 12"],
        browserName: "chromium",
        viewport: { width: 375, height: 812 },
      },
    },
  ],
});
