import { describe, expect, it } from "vitest";
import {
  hasConfiguredValue,
  loginToIdentityServerAdmin,
  parseIdentityServerAdminCredentials,
} from "../../e2e/helpers/identityserverAdmin";

const validDocument = {
  version: 1,
  panelUrl: "https://localhost:7127",
  username: "admin@example.invalid",
  password: "local-test-password",
  expected: {
    publicClientId: "client_acc8fe2608a830b8125e7705cdf71fc5",
    apiResourceName: "ania.api",
    apiScopeName: "ania.api.admin",
    apiResourceClaims: ["role"],
    apiScopeClaims: [],
  },
};

const safeError = (document: unknown): string => {
  try {
    parseIdentityServerAdminCredentials(document);
    throw new Error("Se esperaba un documento inválido");
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
};

interface LoginPageMockOptions {
  readonly isAuthenticated?: boolean;
  readonly initialUrl?: string;
  readonly initialUrlAfterGoto?: string;
  readonly returnToPanel?: boolean;
  readonly failNavigation?: boolean;
  readonly failUsernameFill?: Error;
      readonly fetch?: typeof fetch;
}

const createLoginPageMock = (options: LoginPageMockOptions = {}) => {
  let currentUrl = options.initialUrl ?? "https://localhost:44310/connect/authorize";
  let evaluateCalls = 0;
  const gotoUrls: string[] = [];
  const username = {
    waitFor: async () => undefined,
    fill: async () => {
      if (options.failUsernameFill) throw options.failUsernameFill;
    },
  };
  const password = {
    waitFor: async () => undefined,
    fill: async () => undefined,
  };
  const submit = {
    waitFor: async () => undefined,
    click: async () => undefined,
  };
  const page = {
    goto: async (url: string) => {
      gotoUrls.push(url);
      if (options.failNavigation) throw new Error("unsafe navigation details");
      currentUrl =
        options.initialUrlAfterGoto ??
        options.initialUrl ??
        "https://localhost:44310/connect/authorize";
    },
    url: () => currentUrl,
    locator: (selector: string) => {
      if (selector === "#Username") return username;
      if (selector === "#Password") return password;
      if (selector === 'button[name="button"][value="login"]') return submit;
      return { waitFor: async () => undefined };
    },
    waitForURL: async (predicate: (url: URL) => boolean) => {
      const nextUrl = options.returnToPanel === false ? currentUrl : "https://localhost:7127/";
      const next = new URL(nextUrl);
      if (!predicate(next)) throw new Error("unsafe return details");
      currentUrl = next.toString();
    },
    evaluate: async (pageFunction: unknown) => {
      evaluateCalls += 1;
      if (!options.fetch) return options.isAuthenticated ?? true;

      const originalFetch = globalThis.fetch;
      globalThis.fetch = options.fetch;
      try {
        return await (pageFunction as () => Promise<unknown>)();
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  } as unknown as import("@playwright/test").Page;

  return {
    page,
    gotoUrls,
    get evaluateCalls() {
      return evaluateCalls;
    },
  };
};

describe("parseIdentityServerAdminCredentials", () => {
  it("acepta el esquema esperado y normaliza la URL del panel", () => {
    const credentials = parseIdentityServerAdminCredentials(validDocument);

    expect(credentials.panelUrl).toBe("https://localhost:7127/");
    expect(credentials.expected.apiResourceClaims).toEqual(["role"]);
    expect(credentials.expected.apiScopeClaims).toEqual([]);
  });

  it.each([
    undefined,
    { ...validDocument, version: 2 },
    { ...validDocument, expected: undefined },
    { ...validDocument, panelUrl: "not-a-url" },
    { ...validDocument, username: "REPLACE_WITH_IDENTITYSERVER_ADMIN_USERNAME" },
    { ...validDocument, password: "REPLACE_WITH_IDENTITYSERVER_ADMIN_PASSWORD" },
  ])("rechaza documentos incompletos o placeholders", (document) => {
    expect(safeError(document)).toContain("falta o no es válido");
  });

  it("rechaza campos desconocidos y nunca revela credenciales", () => {
    const username = "private-admin-user";
    const password = "private-admin-password";
    const message = safeError({
      ...validDocument,
      username,
      password,
      unexpected: "no permitido",
    });

    expect(message).toContain("falta o no es válido");
    expect(message).not.toContain(username);
    expect(message).not.toContain(password);
  });

  it("rechaza URL del panel con credenciales, query o fragmento", () => {
    for (const panelUrl of [
      "https://admin:secret@localhost:7127",
      "https://localhost:7127?returnUrl=/",
      "https://localhost:7127/#config",
    ]) {
      expect(safeError({ ...validDocument, panelUrl })).toContain("falta o no es válido");
    }
  });

  it("compara los scopes OIDC con igualdad exacta y sensible a mayúsculas", () => {
    expect(hasConfiguredValue(["openid", "ania.api.admin"], "ania.api.admin")).toBe(true);
    expect(hasConfiguredValue(["ANIA.API.ADMIN"], "ania.api.admin")).toBe(false);
    expect(hasConfiguredValue(["ania-api-admin"], "ania.api.admin")).toBe(false);
  });

  it("inicia en la ruta explícita y acepta el marcador autenticado", async () => {
    const mock = createLoginPageMock({ isAuthenticated: true });

    await loginToIdentityServerAdmin(
      mock.page,
      parseIdentityServerAdminCredentials(validDocument),
    );

    expect(mock.gotoUrls).toEqual(["https://localhost:7127/account/login"]);
    expect(mock.evaluateCalls).toBe(1);
  });

  it("consulta /User con el encabezado anti-CSRF nativo y credenciales same-origin", async () => {
    const requests: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
    const mock = createLoginPageMock({
      fetch: async (input, init) => {
        requests.push({ input, init });
        const isExpectedRequest =
          input === "/User" &&
          init?.credentials === "same-origin" &&
          JSON.stringify(init.headers) === JSON.stringify({ "X-ANTI-CSRF": "1" });
        return new Response(JSON.stringify({ isAuthenticated: isExpectedRequest }), {
          status: isExpectedRequest ? 200 : 403,
        });
      },
    });

    await loginToIdentityServerAdmin(
      mock.page,
      parseIdentityServerAdminCredentials(validDocument),
    );

    expect(requests).toEqual([
      {
        input: "/User",
        init: { credentials: "same-origin", headers: { "X-ANTI-CSRF": "1" } },
      },
    ]);
  });

  it("rechaza el marcador no autenticado con el código de sesión", async () => {
    const mock = createLoginPageMock({ isAuthenticated: false });

    await expect(
      loginToIdentityServerAdmin(mock.page, parseIdentityServerAdminCredentials(validDocument)),
    ).rejects.toThrow("session_check");
    expect(mock.evaluateCalls).toBe(1);
  });

  it.each([
    ["navigation", { failNavigation: true }],
    ["expected_STS", { initialUrlAfterGoto: "https://localhost:7127/" }],
    ["submit_return", { returnToPanel: false }],
  ] as const)("conserva el código de fallo %s", async (code, options) => {
    const mock = createLoginPageMock(options);

    await expect(
      loginToIdentityServerAdmin(mock.page, parseIdentityServerAdminCredentials(validDocument)),
    ).rejects.toThrow(code);
  });

  it("sanitiza fallos al rellenar credenciales y conserva el código de formulario", async () => {
    const username = "private-admin-user";
    const password = "private-admin-password";
    const mock = createLoginPageMock({
      failUsernameFill: new Error(`unsafe submitted values: ${username} ${password}`),
    });
    const credentials = parseIdentityServerAdminCredentials({
      ...validDocument,
      username,
      password,
    });

    let message = "";
    try {
      await loginToIdentityServerAdmin(mock.page, credentials);
      throw new Error("Se esperaba un fallo de login");
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).toContain("form");
    expect(message).toContain("no se pudo verificar de forma segura");
    expect(message).not.toContain(username);
    expect(message).not.toContain(password);
    expect(message).not.toContain("https://localhost:7127");
    expect(message).not.toContain("https://localhost:44310");
  });
});
