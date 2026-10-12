import { randomBytes } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import {
  E2E_APP_ORIGIN,
  writeE2ERegistrationCredentials,
} from "./helpers/oidc";

const identityRegistrationFailure = async (page: Page): Promise<never> => {
  const text = await page
    .locator("body")
    .innerText()
    .catch(() => "");

  if (/mfa|multi-factor|two-factor|authenticator|verification code|código de verificación/i.test(text)) {
    throw new Error(
      "[E2E registration] MFA is unsupported by the real registration journey; use a non-MFA local account.",
    );
  }
  if (/error|invalid.*redirect|unauthorized.*client|cors|client.*not found/i.test(text)) {
    throw new Error(
      "[E2E registration] Duende rejected the registration flow; verify the local client redirect and CORS configuration.",
    );
  }
  throw new Error(
    "[E2E registration] Duende did not present the supported registration form or callback.",
  );
};

const createUniqueBuyerCredentials = () => {
  const suffix = `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}`;
  return {
    username: `e2e-buyer-${suffix}`,
    email: `e2e-buyer-${suffix}@example.invalid`,
    password: `Aa1!${randomBytes(18).toString("base64url")}`,
  };
};

const isCallbackUrl = (value: string | URL): boolean => {
  const url = typeof value === "string" ? new URL(value) : value;
  return url.origin === E2E_APP_ORIGIN && url.pathname === "/auth/callback";
};

const waitForCallbackOrConsent = async (page: Page): Promise<void> => {
  const allowButton = page.getByRole("button", {
    name: /^(?:Yes,\s*Allow|Sí,\s*permitir)$/i,
  });
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    if (isCallbackUrl(page.url())) return;
    if (await allowButton.isVisible().catch(() => false)) {
      await allowButton.click();
      break;
    }
    await page.waitForTimeout(100);
  }

  await page.waitForURL(isCallbackUrl, { timeout: 30_000 });
};

const readProfileRoleClaims = async (page: Page): Promise<string[]> =>
  page.evaluate(() => {
    const entry = Object.entries(window.localStorage).find(([name]) =>
      name.startsWith("oidc.user:"),
    );
    if (!entry) return [];

    try {
      const value: unknown = JSON.parse(entry[1]);
      if (!value || typeof value !== "object" || Array.isArray(value)) return [];

      const profile = (value as { profile?: unknown }).profile;
      if (!profile || typeof profile !== "object" || Array.isArray(profile)) return [];

      const claims = profile as { role?: unknown; roles?: unknown };
      const normalize = (claim: unknown): string[] => {
        if (typeof claim === "string") {
          return claim
            .split(/[\s,]+/)
            .map((role) => role.trim())
            .filter(Boolean);
        }
        if (Array.isArray(claim)) return claim.flatMap(normalize);
        return [];
      };

      return [claims.role, claims.roles].flatMap(normalize);
    } catch {
      return [];
    }
  });

test.describe("real buyer registration", () => {
  // Keep this journey independent from the role-session projects and their storage state.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("registers a unique buyer through hosted IdentityServer", async ({ page }) => {
    test.setTimeout(120_000);
    const credentials = createUniqueBuyerCredentials();

    await page.goto(`${E2E_APP_ORIGIN}/register`, { waitUntil: "domcontentloaded" });

    const usernameInput = page.locator("#UserName");
    const emailInput = page.locator("#Email");
    const passwordInput = page.locator("#Password");
    const confirmPasswordInput = page.locator("#ConfirmPassword");

    try {
      await Promise.all(
        [usernameInput, emailInput, passwordInput, confirmPasswordInput].map((input) =>
          input.waitFor({ state: "visible", timeout: 15_000 }),
        ),
      );
      await usernameInput.fill(credentials.username);
      await emailInput.fill(credentials.email);
      await passwordInput.fill(credentials.password);
      await confirmPasswordInput.fill(credentials.password);
    } catch {
      return identityRegistrationFailure(page);
    }

    const registerButton = page
      .locator('button[type="submit"]')
      .filter({ hasText: /^\s*(?:Crear cuenta|Create account)\s*$/ })
      .first();
    try {
      await registerButton.waitFor({ state: "visible", timeout: 15_000 });
      await expect(registerButton).not.toHaveAttribute("name");
      await expect(registerButton).not.toHaveAttribute("value");
    } catch {
      return identityRegistrationFailure(page);
    }

    try {
      await registerButton.click();
      // Duende may request consent before redirecting to the SPA callback.
      await waitForCallbackOrConsent(page);
    } catch {
      return identityRegistrationFailure(page);
    }

    // Reaching the SPA callback proves that IdentityServer created and signed in
    // the account, even if a later client-side assertion fails.
    writeE2ERegistrationCredentials({
      username: credentials.username,
      password: credentials.password,
    });

    try {
      await expect(page).toHaveURL(`${E2E_APP_ORIGIN}/`, { timeout: 30_000 });
    } catch {
      return identityRegistrationFailure(page);
    }

    await expect(page.getByRole("button", { name: "Cerrar sesión", exact: true })).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Admin", exact: true })).toHaveCount(0);

    const profileRoles = await readProfileRoleClaims(page);
    const normalizedRoles = profileRoles.map((role) => role.toLowerCase());
    expect(normalizedRoles).toContain("comprador");
    expect(normalizedRoles).not.toContain("admin");
    expect(normalizedRoles).not.toContain("adminaniaidentity");
  });
});
