import { test as base, expect } from "@playwright/test";
import { installRealOidcSession, type RequiredE2ERole } from "./oidc";

// Keep test-file collection side-effect free. Playwright imports real test files
// even when a different project is selected; role credential/session validation
// belongs to playwright.config.ts and session installation.
type RealFixtures = {
  e2eRole: RequiredE2ERole;
};

/** Real-only fixtures: expose the project role and install its OIDC User before navigation. */
export const test = base.extend<RealFixtures>({
  e2eRole: async ({ browserName: _browserName }, use, testInfo) => {
    const role = testInfo.project.metadata.role;
    if (role !== "admin" && role !== "comprador") {
      throw new Error(
        `[E2E real] Project ${testInfo.project.name} has no supported role metadata.`,
      );
    }
    await use(role);
  },
  page: async ({ page, e2eRole }, use) => {
    await installRealOidcSession(page, e2eRole);
    await use(page);
  },
});

export { expect };
