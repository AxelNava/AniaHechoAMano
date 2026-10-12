import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import type { User, UserProfile } from "oidc-client-ts";
import type { AuthEventHandlers, AuthServicePort } from "@/auth/authService";
import { createAuthStore } from "@/stores/authStore";

const createUser = (overrides: Partial<User> = {}): User =>
  ({
    access_token: "token-that-must-not-enter-pinia",
    expired: false,
    profile: {
      sub: "admin-1",
      name: "Ana",
      role: "admin",
      iss: "https://localhost:44310",
      aud: "client_acc8fe2608a830b8125e7705cdf71fc5",
      exp: 4_102_444_800,
      iat: 1_700_000_000,
    } as UserProfile,
    ...overrides,
  }) as User;

const createService = (user: User | null = createUser()) => {
  let handlers: AuthEventHandlers | undefined;
  const unsubscribe = vi.fn();
  const service: AuthServicePort = {
    getUser: vi.fn().mockResolvedValue(user),
    getAccessToken: vi.fn().mockResolvedValue(user?.access_token ?? null),
    signin: vi.fn().mockResolvedValue(undefined),
    register: vi.fn().mockResolvedValue(undefined),
    signinCallback: vi
      .fn()
      .mockResolvedValue({ user: user ?? createUser(), returnUrl: "/admin/products" }),
    signout: vi.fn().mockResolvedValue(undefined),
    signoutCallback: vi.fn().mockResolvedValue(undefined),
    cleanup: vi.fn().mockResolvedValue(undefined),
    subscribeToUserEvents: vi.fn((eventHandlers: AuthEventHandlers) => {
      handlers = eventHandlers;
      return unsubscribe;
    }),
  };

  return { service, getHandlers: () => handlers, unsubscribe };
};

describe("authStore", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    setActivePinia(createPinia());
  });

  it("carga una sesión vigente y expone solo perfil y estado derivado", async () => {
    const { service } = createService();
    const store = createAuthStore(service)();

    await store.initialize();

    expect(store.loading).toBe(false);
    expect(store.initialized).toBe(true);
    expect(store.authenticated).toBe(true);
    expect(store.profile).toMatchObject({ sub: "admin-1", role: "admin" });
    expect(store.user).toEqual({ profile: expect.objectContaining({ sub: "admin-1" }) });
    expect(JSON.stringify(store.$state)).not.toContain("token-that-must-not-enter-pinia");
    expect(store.$state).not.toHaveProperty("accessToken");
  });

  it("normaliza los claims role y roles y expone comprobaciones de autorización", async () => {
    const { service } = createService(
      createUser({
        profile: {
          ...createUser().profile,
          role: "admin",
          roles: [" comprador ", "AdminAniaIdentity"],
        } as UserProfile,
      }),
    );
    const store = createAuthStore(service)();

    await store.initialize();

    expect(store.roles).toEqual(["admin", "comprador", "AdminAniaIdentity"]);
    expect(store.hasAnyRole(["comprador"])).toBe(true);
    expect(store.hasAnyRole("AdminAniaIdentity")).toBe(true);
    expect(store.isAdmin).toBe(true);
    expect(store.isBuyer).toBe(true);
  });

  it("descarta una sesión expirada", async () => {
    const { service } = createService(createUser({ expired: true }));
    const store = createAuthStore(service)();

    await store.initialize();

    expect(store.authenticated).toBe(false);
    expect(store.user).toBeNull();
  });

  it("sincroniza carga, descarga y expiración desde eventos OIDC", async () => {
    const { service, getHandlers } = createService(null);
    const store = createAuthStore(service)();
    await store.initialize();
    const handlers = getHandlers();

    handlers?.userLoaded(createUser());
    expect(store.authenticated).toBe(true);
    sessionStorage.setItem("ania_pedido_cliente", "borrador");

    handlers?.accessTokenExpired();
    expect(store.authenticated).toBe(false);
    expect(sessionStorage.getItem("ania_pedido_cliente")).toBeNull();

    handlers?.userLoaded(createUser());
    handlers?.userUnloaded();
    expect(store.authenticated).toBe(false);
  });

  it("desuscribe los eventos cuando se detiene la sincronización", async () => {
    const { service, unsubscribe } = createService();
    const store = createAuthStore(service)();
    await store.initialize();

    store.stopEventSynchronization();

    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("limpia el estado y marca la inicialización aunque falle la sesión", async () => {
    const { service } = createService();
    vi.mocked(service.getUser).mockRejectedValue(new Error("technical details"));
    const store = createAuthStore(service)();

    await expect(store.initialize()).resolves.toBeUndefined();

    expect(store.authenticated).toBe(false);
    expect(store.error).toBe("No se pudo cargar la sesión. Inténtalo de nuevo.");
    expect(store.loading).toBe(false);
    expect(store.initialized).toBe(true);
  });

  it("continúa la restauración si falla la suscripción de eventos", async () => {
    const { service } = createService();
    vi.mocked(service.subscribeToUserEvents).mockImplementation(() => {
      throw new Error("event subscription failed");
    });
    const store = createAuthStore(service)();

    await expect(store.initialize()).resolves.toBeUndefined();

    expect(store.authenticated).toBe(true);
    expect(store.loading).toBe(false);
    expect(store.initialized).toBe(true);
    expect(store.error).toBe("No se pudo cargar la sesión. Inténtalo de nuevo.");
  });

  it("conserva el borrador al iniciar el redirect de login", async () => {
    sessionStorage.setItem("ania_pedido_cliente", "borrador");
    const { service } = createService(null);
    const store = createAuthStore(service)();

    await store.signin("/pedido");

    expect(sessionStorage.getItem("ania_pedido_cliente")).toBe("borrador");
  });

  it("inicia el registro hospedado sin guardar credenciales en Pinia", async () => {
    const { service } = createService(null);
    const store = createAuthStore(service)();

    await store.register("/pedido?paso=2");

    expect(service.register).toHaveBeenCalledWith("/pedido?paso=2");
    expect(JSON.stringify(store.$state)).not.toContain("password");
  });

  it("presenta errores del registro hospedado en español", async () => {
    const { service } = createService(null);
    vi.mocked(service.register).mockRejectedValue(new Error("technical details"));
    const store = createAuthStore(service)();

    await store.register();

    expect(store.error).toBe("No se pudo abrir el registro. Inténtalo de nuevo.");
    expect(store.loading).toBe(false);
  });

  it("borra solo el borrador al cerrar sesión y durante cleanup por 401", async () => {
    const { service } = createService();
    const store = createAuthStore(service)();
    localStorage.setItem("ania_pedido_cliente", "legado");
    sessionStorage.setItem("ania_pedido_cliente", "borrador");
    sessionStorage.setItem("oidc.state", "conservar");

    await store.signout();

    expect(localStorage.getItem("ania_pedido_cliente")).toBeNull();
    expect(sessionStorage.getItem("ania_pedido_cliente")).toBeNull();
    expect(sessionStorage.getItem("oidc.state")).toBe("conservar");

    sessionStorage.setItem("ania_pedido_cliente", "otro");
    await store.cleanup();
    expect(sessionStorage.getItem("ania_pedido_cliente")).toBeNull();
  });
});
