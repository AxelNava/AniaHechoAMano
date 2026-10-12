import type { Page, Request, Response } from "@playwright/test";
import { test, expect } from "./helpers/realTest";

const PUBLIC_CATALOG_PATHS = new Set(["/api/categories", "/api/productos"]);
const PROTECTED_ORDERS_PATH = "/api/pedidos";

const apiPath = (request: Request): string => new URL(request.url()).pathname;
const isPublicCatalogRequest = (request: Request): boolean =>
  request.method() === "GET" && PUBLIC_CATALOG_PATHS.has(apiPath(request));
const isProtectedOrdersResponse = (response: Response): boolean =>
  response.request().method() === "GET" && apiPath(response.request()) === PROTECTED_ORDERS_PATH;

const expectNoAuthorization = (request: Request): void => {
  expect(request.headers()["authorization"]).toBeUndefined();
};

const expectSuccessfulPublicNavigation = async (page: Page, path: string): Promise<Request> => {
  const responsePromise = page.waitForResponse(
    (response) => isPublicCatalogRequest(response.request()) && response.status() >= 200,
  );
  await page.goto(path);
  const response = await responsePromise;
  expect(response.status()).toBeGreaterThanOrEqual(200);
  expect(response.status()).toBeLessThan(300);
  expectNoAuthorization(response.request());
  return response.request();
};

const hasOidcSession = (page: Page): Promise<boolean> =>
  page.evaluate(() =>
    Object.entries(window.localStorage)
      .filter(([name]) => name.startsWith("oidc.user:"))
      .some(([, value]) => {
        try {
          const user = JSON.parse(value) as { access_token?: unknown };
          return typeof user.access_token === "string" && user.access_token.length > 0;
        } catch {
          return false;
        }
      }),
  );

test.describe("Real navigation and role access matrix", () => {
  test("anonymous visitors keep public access and receive a safe login return URL", async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    try {
      await expectSuccessfulPublicNavigation(page, "/");
      await expect(page).toHaveURL("/");

      await expectSuccessfulPublicNavigation(page, "/categoria/papeleria-creativa");
      await expect(page).toHaveURL("/categoria/papeleria-creativa");
      await expect(page.getByRole("heading", { name: "Papelería creativa" })).toBeVisible();

      await page.goto("/admin/solicitudes");
      await expect(page).toHaveURL((url) => {
        const returnUrl = url.searchParams.get("returnUrl");
        return (
          url.pathname === "/login" &&
          returnUrl === "/admin/solicitudes" &&
          returnUrl.startsWith("/") &&
          !returnUrl.startsWith("//")
        );
      });
    } finally {
      await context.close();
    }
  });

  test("authenticated role follows its public and protected access policy", async ({
    page,
    e2eRole,
  }) => {
    await expectSuccessfulPublicNavigation(page, "/");
    await expect(page).toHaveURL("/");

    if (e2eRole === "admin") {
      await expectSuccessfulPublicNavigation(page, "/categoria/papeleria-creativa");
      await expect(page).toHaveURL("/categoria/papeleria-creativa");
      await expect(page.getByRole("heading", { name: "Papelería creativa" })).toBeVisible();

      await page.goto("/pedido");
      await expect(page).toHaveURL("/pedido");
      await expect(page.getByRole("heading", { name: /Tu pedido/ })).toBeVisible();
    }

    const protectedResponsePromise = page.waitForResponse(isProtectedOrdersResponse);
    await page.goto("/admin/solicitudes");
    const protectedResponse = await protectedResponsePromise;
    expect(protectedResponse.request().headers()["authorization"]).toMatch(/^Bearer\s+\S+$/);

    if (e2eRole === "admin") {
      expect(protectedResponse.status()).toBeGreaterThanOrEqual(200);
      expect(protectedResponse.status()).toBeLessThan(300);
      await expect(page).toHaveURL("/admin/solicitudes");
      await expect(page.getByRole("heading", { name: "Solicitudes" })).toBeVisible();
      return;
    }

    expect(protectedResponse.status()).toBe(403);
    await expect(page).toHaveURL("/sin-permisos");
    await expect(hasOidcSession(page)).resolves.toBe(true);
  });
});
