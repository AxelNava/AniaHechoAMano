import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: /identityserver-admin-panel\.spec\.ts$/,
  fullyParallel: false,
  forbidOnly: true,
  timeout: 120_000,
  retries: 0,
  workers: 1,
  captureGitInfo: { commit: false, diff: false },
  reporter: [["line"]],
  use: {
    ...devices["Desktop Chrome"],
    headless: false,
    trace: "off",
    screenshot: "off",
    video: "off",
  },
});
