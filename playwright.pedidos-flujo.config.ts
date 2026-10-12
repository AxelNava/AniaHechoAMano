import { defineConfig, devices } from "@playwright/test";
import { E2E_APP_ORIGIN } from "./e2e/helpers/oidc";

export default defineConfig({
  testDir: "./e2e",
  testMatch: /pedidos-flujo-real\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  use: {
    ...devices["Desktop Chrome"],
    baseURL: E2E_APP_ORIGIN,
    headless: false,
  },
});
