import { describe, expect, it, vi } from "vitest";
import type { User } from "oidc-client-ts";
import {
  ADMIN_RETURN_URL,
  REGISTER_RETURN_URL,
  AuthService,
  sanitizeReturnUrl,
  type UserManagerAdapter,
} from "@/auth/authService";

const createUser = (overrides: Partial<User> = {}): User =>
  ({
    access_token: "access-token",
    expired: false,
    profile: { sub: "admin-1", name: "Ana" },
    state: undefined,
    ...overrides,
  }) as User;

const createManager = (user: User | null = null) => {
  const callbacks = {
    loaded: undefined as ((loadedUser: User) => void) | undefined,
    unloaded: undefined as (() => void) | undefined,
    expired: undefined as (() => void) | undefined,
  };
  const manager = {
    getUser: vi.fn().mockResolvedValue(user),
    signinRedirect: vi.fn().mockResolvedValue(undefined),
    signinRedirectCallback: vi.fn().mockResolvedValue(createUser()),
    signoutRedirect: vi.fn().mockResolvedValue(undefined),
    signoutRedirectCallback: vi.fn().mockResolvedValue(undefined),
    removeUser: vi.fn().mockResolvedValue(undefined),
    clearStaleState: vi.fn().mockResolvedValue(undefined),
    events: {
      addUserLoaded: vi.fn((callback: (loadedUser: User) => void) => {
        callbacks.loaded = callback;
      }),
      removeUserLoaded: vi.fn(),
      addUserUnloaded: vi.fn((callback: () => void) => {
        callbacks.unloaded = callback;
      }),
      removeUserUnloaded: vi.fn(),
      addAccessTokenExpired: vi.fn((callback: () => void) => {
        callbacks.expired = callback;
      }),
      removeAccessTokenExpired: vi.fn(),
    },
  };

  return { manager: manager as unknown as UserManagerAdapter, mocks: manager, callbacks };
};

describe("sanitizeReturnUrl", () => {
  it.each(["/admin/products", "/admin/orders?status=pending", "/admin#stock"])(
    "acepta una ruta local segura: %s",
    (returnUrl) => {
      expect(sanitizeReturnUrl(returnUrl)).toBe(returnUrl);
    },
  );

  it.each([
    undefined,
    null,
    "",
    "admin/products",
    "//evil.example/path",
    "/\\evil.example/path",
    "https://evil.example/path",
    "javascript:alert(1)",
  ])("rechaza redirecciones abiertas: %s", (returnUrl) => {
    expect(sanitizeReturnUrl(returnUrl)).toBe(ADMIN_RETURN_URL);
  });
});

describe("AuthService", () => {
  it("devuelve el token solo para una sesión vigente", async () => {
    const active = createManager(createUser());
    const expired = createManager(createUser({ expired: true }));
    const unknownExpiry = createManager(createUser({ expired: undefined }));

    await expect(new AuthService(() => active.manager).getAccessToken()).resolves.toBe(
      "access-token",
    );
    await expect(new AuthService(() => expired.manager).getAccessToken()).resolves.toBeNull();
    await expect(new AuthService(() => unknownExpiry.manager).getAccessToken()).resolves.toBeNull();
  });

  it("inicia sesión con un returnUrl seguro dentro del estado OIDC", async () => {
    const { manager, mocks } = createManager();
    const service = new AuthService(() => manager);

    await service.signin("//evil.example/steal");

    expect(mocks.signinRedirect).toHaveBeenCalledWith({
      state: { returnUrl: ADMIN_RETURN_URL },
    });
  });

  it("inicia el registro hospedado con acr_values y el retorno público seguro", async () => {
    const { manager, mocks } = createManager();
    const service = new AuthService(() => manager);

    await service.register("/pedido?paso=2");

    expect(mocks.signinRedirect).toHaveBeenCalledWith({
      state: { returnUrl: "/pedido?paso=2" },
      extraQueryParams: { acr_values: "registration" },
    });

    await service.register("https://evil.example/steal");

    expect(mocks.signinRedirect).toHaveBeenLastCalledWith({
      state: { returnUrl: REGISTER_RETURN_URL },
      extraQueryParams: { acr_values: "registration" },
    });
  });

  it("recupera y vuelve a validar el returnUrl del callback", async () => {
    const { manager, mocks } = createManager();
    mocks.signinRedirectCallback.mockResolvedValue(
      createUser({ state: { returnUrl: "/admin/orders" } }),
    );
    const service = new AuthService(() => manager);

    await expect(service.signinCallback()).resolves.toMatchObject({
      returnUrl: "/admin/orders",
      user: { access_token: "access-token" },
    });

    mocks.signinRedirectCallback.mockResolvedValue(
      createUser({ state: { returnUrl: "//evil.example/steal" } }),
    );
    await expect(service.signinCallback()).resolves.toMatchObject({
      returnUrl: ADMIN_RETURN_URL,
    });
  });

  it("completa el logout y limpia usuario y estado OIDC obsoleto", async () => {
    const { manager, mocks } = createManager();
    const service = new AuthService(() => manager);

    await service.signoutCallback();

    expect(mocks.signoutRedirectCallback).toHaveBeenCalledOnce();
    expect(mocks.removeUser).toHaveBeenCalledOnce();
    expect(mocks.clearStaleState).toHaveBeenCalledOnce();
  });

  it("suscribe y desuscribe los eventos del UserManager", () => {
    const { manager, mocks } = createManager();
    const service = new AuthService(() => manager);
    const handlers = {
      userLoaded: vi.fn(),
      userUnloaded: vi.fn(),
      accessTokenExpired: vi.fn(),
    };

    const unsubscribe = service.subscribeToUserEvents(handlers);
    unsubscribe();

    expect(mocks.events.addUserLoaded).toHaveBeenCalledWith(handlers.userLoaded);
    expect(mocks.events.addUserUnloaded).toHaveBeenCalledWith(handlers.userUnloaded);
    expect(mocks.events.addAccessTokenExpired).toHaveBeenCalledWith(handlers.accessTokenExpired);
    expect(mocks.events.removeUserLoaded).toHaveBeenCalledWith(handlers.userLoaded);
    expect(mocks.events.removeUserUnloaded).toHaveBeenCalledWith(handlers.userUnloaded);
    expect(mocks.events.removeAccessTokenExpired).toHaveBeenCalledWith(handlers.accessTokenExpired);
  });
});
