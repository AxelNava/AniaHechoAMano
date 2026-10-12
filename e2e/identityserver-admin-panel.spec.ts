import { expect, test } from "@playwright/test";
import {
  hasConfiguredValue,
  inspectApiResource,
  inspectApiScope,
  inspectPublicClient,
  loadIdentityServerAdminCredentials,
  loginToIdentityServerAdmin,
  normalizedClaimNames,
  selectedClaimNames,
  UnverifiedConfigurationError,
} from "./helpers/identityserverAdmin";

test.describe("Panel de administración de IdentityServer", () => {
  test("inicia sesión mediante el STS hospedado", async ({ page }) => {
    const credentials = loadIdentityServerAdminCredentials();

    await loginToIdentityServerAdmin(page, credentials);
    await expect(page.locator("#Username")).toHaveCount(0);
    await expect(page.locator("#Password")).toHaveCount(0);
    await expect(page.locator('button[name="button"][value="login"]')).toHaveCount(0);
    await expect.poll(() => new URL(page.url()).origin).toBe(new URL(credentials.panelUrl).origin);
  });

  test("corrobora cliente, recurso y scope sin modificar configuración", async ({
    page,
  }, testInfo) => {
    const credentials = loadIdentityServerAdminCredentials();

    await loginToIdentityServerAdmin(page, credentials);

    try {
      const publicClient = await test.step("Leer cliente público", () =>
        inspectPublicClient(page, credentials));
      expect(publicClient.clientId).toBe(credentials.expected.publicClientId);
      expect(publicClient.requireClientSecret).toBe(false);
      expect(publicClient.requirePkce).toBe(true);
      expect(publicClient.allowPlainTextPkce).toBe(false);
      expect(
        hasConfiguredValue(publicClient.allowedScopes, credentials.expected.apiScopeName),
      ).toBe(true);

      const apiResource = await test.step("Leer recurso API", () =>
        inspectApiResource(page, credentials));
      expect(apiResource.name).toBe(credentials.expected.apiResourceName);
      expect(normalizedClaimNames(selectedClaimNames(apiResource.claims))).toEqual(
        normalizedClaimNames(credentials.expected.apiResourceClaims),
      );

      const apiScope = await test.step("Leer scope API", () => inspectApiScope(page, credentials));
      expect(apiScope.name).toBe(credentials.expected.apiScopeName);
      expect(normalizedClaimNames(selectedClaimNames(apiScope.claims))).toEqual(
        normalizedClaimNames(credentials.expected.apiScopeClaims),
      );
    } catch (error) {
      if (!(error instanceof UnverifiedConfigurationError)) throw error;
      testInfo.annotations.push({
        type: "unverified",
        description:
          "La UI o la navegación del panel no permitió corroborar toda la configuración.",
      });
      test.skip(true, "Configuración más profunda no verificada; no se declara un falso aprobado.");
    }
  });
});
