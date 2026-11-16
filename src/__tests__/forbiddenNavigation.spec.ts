import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import type { User, UserProfile } from "oidc-client-ts";
import type { AuthEventHandlers, AuthServicePort } from "@/auth/authService";
import router from "@/router";
import { createAuthStore } from "@/stores/authStore";
import { shouldNavigateToForbidden } from "@/services/http/forbiddenNavigation";

const createUser = (role: string): User =>
  ({
    access_token: "token-de-prueba",
    expired: false,
    profile: {
      sub: "usuario-1",
      name: "Ana",
      role,
      iss: "https://localhost:44310",
      aud: "cliente",
      exp: 4_102_444_800,
      iat: 1_700_000_000,
    } as UserProfile,
  }) as User;

const createService = (user: User | null): AuthServicePort => ({
  getUser: vi.fn().mockResolvedValue(user),
  getAccessToken: vi.fn().mockResolvedValue(user?.access_token ?? null),
  signin: vi.fn().mockResolvedValue(undefined),
  register: vi.fn().mockResolvedValue(undefined),
  signinCallback: vi.fn().mockResolvedValue({ user: user ?? createUser("comprador"), returnUrl: "/" }),
  signout: vi.fn().mockResolvedValue(undefined),
  signoutCallback: vi.fn().mockResolvedValue(undefined),
  cleanup: vi.fn().mockResolvedValue(undefined),
  subscribeToUserEvents: vi.fn((_handlers: AuthEventHandlers) => () => undefined),
});

const createSession = async (role: string | null) => {
  const store = createAuthStore(createService(role === null ? null : createUser(role)))();
  await store.initialize();
  return store;
};

describe("shouldNavigateToForbidden", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    setActivePinia(createPinia());
  });

  it("redirige a /sin-permisos cuando la ruta exige un rol que la sesión no tiene", async () => {
    const buyerSession = await createSession("comprador");
    const agenda = router.resolve("/admin/agenda");

    expect(shouldNavigateToForbidden(agenda, buyerSession)).toBe(true);
  });

  it("no redirige cuando la ruta actual sí está permitida para los roles de la sesión", async () => {
    const adminSession = await createSession("admin");
    const agenda = router.resolve("/admin/agenda");

    expect(shouldNavigateToForbidden(agenda, adminSession)).toBe(false);
  });

  it("no redirige cuando la ruta actual no declara roles requeridos", async () => {
    const buyerSession = await createSession("comprador");
    const seguimiento = router.resolve("/pedido/seguimiento/token-abc");

    expect(shouldNavigateToForbidden(seguimiento, buyerSession)).toBe(false);
  });

  it("no redirige cuando la ruta declara roles pero no exige autenticación", async () => {
    const buyerSession = await createSession("comprador");

    expect(
      shouldNavigateToForbidden(
        { name: "publica", meta: { roles: ["admin"] } },
        buyerSession,
      ),
    ).toBe(false);
  });

  it("no redirige cuando la sesión aún no está autenticada", async () => {
    const anonymousSession = await createSession(null);
    const agenda = router.resolve("/admin/agenda");

    expect(shouldNavigateToForbidden(agenda, anonymousSession)).toBe(false);
  });

  it("no vuelve a navegar cuando ya está en /sin-permisos", async () => {
    const buyerSession = await createSession("comprador");
    const forbidden = router.resolve("/sin-permisos");

    expect(shouldNavigateToForbidden(forbidden, buyerSession)).toBe(false);
  });

  it("honra el alias requiredRoles igual que roles", async () => {
    const buyerSession = await createSession("comprador");

    expect(
      shouldNavigateToForbidden(
        { name: "alias", meta: { requiresAuth: true, requiredRoles: ["admin"] } },
        buyerSession,
      ),
    ).toBe(true);
  });

  it("trata una lista de roles sin entradas utilizables como el guard: nadie la cubre", async () => {
    const adminSession = await createSession("admin");

    expect(
      shouldNavigateToForbidden(
        { name: "invalida", meta: { requiresAuth: true, roles: ["  ", 42] } },
        adminSession,
      ),
    ).toBe(true);
  });
});
