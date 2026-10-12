import { defineConfig, devices, type Project } from "@playwright/test";
import { E2E_APP_ORIGIN, loadE2ECredentials } from "./e2e/helpers/oidc";

// The primary suite is intentionally real-only. Credentials are validated by
// auth.setup.ts; this probe only decides whether the optional buyer project is
// needed without making configuration loading fail before setup can report it.
const compradorConfigured = (() => {
  try {
    return loadE2ECredentials().roles.comprador !== undefined;
  } catch {
    return false;
  }
})();

const chrome = { ...devices["Desktop Chrome"] };
const primaryRealTestIgnore = /(?:identityserver-admin-panel|pedidos-flujo-real)\.spec\.ts$/;
const adminProjectTestIgnore =
  /(?:identityserver-admin-panel|pedidos-flujo-real|user-registration-real)\.spec\.ts$/;
const registrationProject = (): Project => ({
  name: "real-registration",
  testMatch: /user-registration-real\.spec\.ts/,
  use: {
    ...chrome,
    storageState: { cookies: [], origins: [] },
  },
});
const compradorProject = (dependencies: readonly string[] = []): Project => ({
  name: "real-comprador",
  dependencies: [...dependencies],
  testMatch: /role-access-real\.spec\.ts/,
  metadata: { role: "comprador" },
  use: chrome,
});

const projects: Project[] = [
  {
    name: "auth-setup",
    testMatch: /auth\.setup\.ts/,
    use: chrome,
  },
  {
    name: "real-admin",
    dependencies: ["auth-setup"],
    testMatch: /.*-real\.spec\.ts/,
    testIgnore: adminProjectTestIgnore,
    metadata: { role: "admin" },
    use: chrome,
  },
  ...(compradorConfigured ? [compradorProject(["auth-setup"])] : []),
  registrationProject(),
];

export default defineConfig({
  testDir: "./e2e",
  // Real tests mutate shared backend data; serialize them to avoid races in the
  // local database and in the generated OIDC session file.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  // These suites mutate shared state or inspect IdentityServer administration;
  // run them through their dedicated configurations instead of the normal
  // parallel real-only suite.
  testIgnore: primaryRealTestIgnore,
  use: {
    baseURL: E2E_APP_ORIGIN,
    headless: false,
    trace: "on-first-retry",
  },
  projects,
});
