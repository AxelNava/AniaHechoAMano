import { test, type Page } from "@playwright/test";
import {
  E2E_APP_ORIGIN,
  loadE2ECredentials,
  type RealSessionLeaf,
  type RequiredE2ERole,
  validateRealSessionLeaf,
  writeRealRoleSessions,
} from "./helpers/oidc";

const setupError = (role: RequiredE2ERole, message: string): never => {
  throw new Error(`[E2E auth setup] ${role}: ${message}`);
};

async function diagnoseIdentityPage(page: Page, role: RequiredE2ERole): Promise<never> {
  const text = await page
    .locator("body")
    .innerText()
    .catch(() => "");
  if (
    /mfa|multi-factor|two-factor|authenticator|verification code|código de verificación/i.test(text)
  ) {
    return setupError(
      role,
      "MFA is unsupported by automated credential setup; use a non-MFA E2E account.",
    );
  }
  if (/error|invalid.*redirect|unauthorized.*client|cors|client.*not found/i.test(text)) {
    return setupError(
      role,
      `Duende rejected the authorization flow. Verify the client redirect URI ${E2E_APP_ORIGIN}/auth/callback, client registration, and CORS origins.`,
    );
  }
  return setupError(
    role,
    "Duende did not present the supported login form. Verify identity availability and client configuration.",
  );
}

async function loginRole(page: Page, role: RequiredE2ERole, username: string, password: string) {
  await page.goto(`${E2E_APP_ORIGIN}/login`, { waitUntil: "domcontentloaded" });

  const usernameInput = page.locator("#Username");
  const passwordInput = page.locator("#Password");
  const loginButton = page.locator('button[name="button"][value="login"]');
  try {
    await Promise.all([
      usernameInput.waitFor({ state: "visible", timeout: 15_000 }),
      passwordInput.waitFor({ state: "visible", timeout: 15_000 }),
      loginButton.waitFor({ state: "visible", timeout: 15_000 }),
    ]);
  } catch {
    return diagnoseIdentityPage(page, role);
  }
  try {
    await usernameInput.fill(username);
    await passwordInput.fill(password);
    await loginButton.click();
  } catch {
    return diagnoseIdentityPage(page, role);
  }

  try {
    await page.waitForURL(
      (url) =>
        url.origin === E2E_APP_ORIGIN &&
        url.pathname !== "/auth/callback" &&
        url.pathname !== "/login",
      { timeout: 30_000 },
    );
  } catch {
    return diagnoseIdentityPage(page, role);
  }

  const leaf: RealSessionLeaf = {
    origin: E2E_APP_ORIGIN,
    localStorage: await page.evaluate(() =>
      Object.keys(window.localStorage).map((name) => ({
        name,
        value: window.localStorage.getItem(name) ?? "",
      })),
    ),
    sessionStorage: await page.evaluate(() =>
      Object.keys(window.sessionStorage).map((name) => ({
        name,
        value: window.sessionStorage.getItem(name) ?? "",
      })),
    ),
  };
  validateRealSessionLeaf(leaf, role);
  return leaf;
}

test("authenticate configured OIDC roles", async ({ browser }) => {
  test.setTimeout(120_000);
  const credentials = loadE2ECredentials();
  const sessions: Partial<Record<RequiredE2ERole, RealSessionLeaf>> = {};

  for (const role of ["admin", "comprador"] as const) {
    const credential = credentials.roles[role];
    if (!credential) continue;
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      const leaf = await loginRole(page, role, credential.username, credential.password);
      sessions[role] = leaf;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("[E2E auth setup]")) throw error;
      setupError(role, "login failed; verify the E2E account and identity service configuration.");
    } finally {
      await context.close();
    }
  }

  const admin =
    sessions.admin ?? setupError("admin", "the required admin session was not generated.");
  writeRealRoleSessions({ admin, ...(sessions.comprador && { comprador: sessions.comprador }) });
});
