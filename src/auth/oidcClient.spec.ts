import { describe, expect, it, vi } from "vitest";
import { WebStorageStateStore } from "oidc-client-ts";
import { buildManageUrl, createOidcSettings, readFrontendEnvironment } from "@/auth/oidcClient";

const validEnvironment = () => ({
  VITE_API_BASE_URL: "http://localhost:3001/api",
  VITE_OIDC_AUTHORITY: "https://localhost:44310",
  VITE_OIDC_CLIENT_ID: "client_acc8fe2608a830b8125e7705cdf71fc5",
  VITE_OIDC_SCOPE: "openid profile roles ania.api.admin",
  VITE_OIDC_REDIRECT_URI: "http://localhost:5173/auth/callback",
  VITE_OIDC_POST_LOGOUT_REDIRECT_URI: "http://localhost:5173/auth/logout-callback",
});

const createStorage = (): Storage => {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear: vi.fn(() => values.clear()),
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    key: vi.fn((index: number) => [...values.keys()][index] ?? null),
    removeItem: vi.fn((key: string) => values.delete(key)),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
  };
};

describe("oidcClient", () => {
  it("construye la URL raíz de Manage desde una autoridad HTTP segura", () => {
    expect(buildManageUrl("https://identity.example/connect")).toBe(
      "https://identity.example/Manage",
    );
    expect(buildManageUrl("http://localhost:5000/identity")).toBe(
      "http://localhost:5000/Manage",
    );
  });

  it.each([
    undefined,
    null,
    "",
    "   ",
    "identity.example",
    "ftp://identity.example",
    "https://user:password@identity.example",
    "https://user@identity.example",
    "https://:password@identity.example",
  ])("rechaza autoridades no accionables: %s", (authority) => {
    expect(buildManageUrl(authority)).toBeNull();
  });

  it("valida y expone el contrato de entorno requerido", () => {
    expect(readFrontendEnvironment(validEnvironment())).toEqual({
      apiBaseUrl: "http://localhost:3001/api",
      authority: "https://localhost:44310",
      clientId: "client_acc8fe2608a830b8125e7705cdf71fc5",
      scope: "openid profile roles ania.api.admin",
      redirectUri: "http://localhost:5173/auth/callback",
      postLogoutRedirectUri: "http://localhost:5173/auth/logout-callback",
    });
  });

  it("crea Authorization Code + PKCE separando usuario compartido y estado de sesión", async () => {
    const localStore = createStorage();
    const sessionStore = createStorage();
    const settings = createOidcSettings(validEnvironment(), localStore, sessionStore);

    expect(settings).toMatchObject({
      authority: "https://localhost:44310",
      client_id: "client_acc8fe2608a830b8125e7705cdf71fc5",
      scope: "openid profile roles ania.api.admin",
      redirect_uri: "http://localhost:5173/auth/callback",
      post_logout_redirect_uri: "http://localhost:5173/auth/logout-callback",
      response_type: "code",
      loadUserInfo: false,
      automaticSilentRenew: false,
      monitorSession: false,
    });
    expect(settings.userStore).toBeInstanceOf(WebStorageStateStore);
    expect(settings.stateStore).toBeInstanceOf(WebStorageStateStore);

    await settings.userStore?.set("user", "stored-user");
    await settings.stateStore?.set("state", "stored-state");

    expect(localStore.setItem).toHaveBeenCalledWith(expect.any(String), "stored-user");
    expect(localStore.setItem).not.toHaveBeenCalledWith(expect.any(String), "stored-state");
    expect(sessionStore.setItem).toHaveBeenCalledWith(expect.any(String), "stored-state");
    expect(sessionStore.setItem).not.toHaveBeenCalledWith(expect.any(String), "stored-user");
    expect(settings).not.toHaveProperty("client_secret");
    expect(settings).not.toHaveProperty("extraQueryParams");
  });

  it("rechaza un scope que no contiene el token exacto roles", () => {
    const environment = {
      ...validEnvironment(),
      VITE_OIDC_SCOPE: "openid profile roles.read ania.api.admin",
    };

    expect(() => readFrontendEnvironment(environment)).toThrow(
      'VITE_OIDC_SCOPE debe incluir el scope exacto "roles", ya que las claims de rol de las rutas son requeridas.',
    );
  });

  it("informa variables faltantes sin filtrar valores de configuración", () => {
    const environment = {
      ...validEnvironment(),
      VITE_OIDC_CLIENT_ID: "",
      VITE_OIDC_SCOPE: "valor-que-no-debe-aparecer",
    };

    let message = "";
    try {
      readFrontendEnvironment(environment);
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).toContain("VITE_OIDC_CLIENT_ID");
    expect(message).not.toContain("valor-que-no-debe-aparecer");
    expect(message).not.toContain("client_acc8fe");
  });
});
