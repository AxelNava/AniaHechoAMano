import type { Page, Request, Response } from "@playwright/test";
import { test, expect } from "./helpers/realTest";

const PUBLIC_CATALOG_PATHS = new Set(["/api/categories", "/api/productos"]);
const PROTECTED_ORDERS_PATH = "/api/pedidos";

const apiPath = (request: Request): string => new URL(request.url()).pathname;
const isPublicCatalogRequest = (request: Request): boolean =>
  request.method() === "GET" && PUBLIC_CATALOG_PATHS.has(apiPath(request));
const isProtectedOrdersRequest = (request: Request): boolean =>
  request.method() === "GET" && apiPath(request) === PROTECTED_ORDERS_PATH;
const isProtectedOrdersResponse = (response: Response): boolean =>
  isProtectedOrdersRequest(response.request());

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

const oidcAccessToken = (page: Page): Promise<string | null> =>
  page.evaluate(() => {
    const entry = Object.entries(window.localStorage).find(([name]) =>
      name.startsWith("oidc.user:"),
    );
    if (!entry) return null;
    try {
      const user = JSON.parse(entry[1]) as { access_token?: unknown };
      return typeof user.access_token === "string" && user.access_token.length > 0
        ? user.access_token
        : null;
    } catch {
      return null;
    }
  });

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
    const publicRequest = await expectSuccessfulPublicNavigation(page, "/");
    await expect(page).toHaveURL("/");

    if (e2eRole === "admin") {
      await expectSuccessfulPublicNavigation(page, "/categoria/papeleria-creativa");
      await expect(page).toHaveURL("/categoria/papeleria-creativa");
      await expect(page.getByRole("heading", { name: "Papelería creativa" })).toBeVisible();

      await page.goto("/pedido");
      await expect(page).toHaveURL("/pedido");
      await expect(page.getByRole("heading", { name: /Tu pedido/ })).toBeVisible();

      const protectedResponsePromise = page.waitForResponse(isProtectedOrdersResponse);
      await page.goto("/admin/solicitudes");
      const protectedResponse = await protectedResponsePromise;
      expect(protectedResponse.request().headers()["authorization"]).toMatch(/^Bearer\s+\S+$/);
      expect(protectedResponse.status()).toBeGreaterThanOrEqual(200);
      expect(protectedResponse.status()).toBeLessThan(300);
      await expect(page).toHaveURL("/admin/solicitudes");
      await expect(page.getByRole("heading", { name: "Solicitudes" })).toBeVisible();
      return;
    }

    // El guard del SPA niega la ruta admin antes de montar la página: la
    // navegación del comprador no dispara la request protegida del API.
    const navigationRequests: Request[] = [];
    page.on("request", (request) => {
      if (isProtectedOrdersRequest(request)) navigationRequests.push(request);
    });
    await page.goto("/admin/solicitudes");
    await expect(page).toHaveURL("/sin-permisos");
    expect(navigationRequests).toHaveLength(0);

    // La denegación server-side del recurso protegido se conserva: una llamada
    // directa con el token del comprador recibe 403 del API.
    const accessToken = await oidcAccessToken(page);
    expect(accessToken).toBeTruthy();
    const apiOrigin = new URL(publicRequest.url()).origin;
    const denied = await page.request.get(`${apiOrigin}${PROTECTED_ORDERS_PATH}`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(denied.status()).toBe(403);
    await expect(hasOidcSession(page)).resolves.toBe(true);
  });
});
