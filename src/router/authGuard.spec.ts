import { describe, expect, it, vi } from "vitest";
import { ADMIN_ROLES, BUYER_ROLE } from "@/stores/authStore";
import { createAuthGuard, initializeAuth } from "./authGuard";
import router, { viewTransitionGuard } from "./index";

const route = (
  path: string,
  requiresAuth = false,
  extraMeta: Record<string, unknown> = {},
) =>
  ({
    fullPath: path,
    name: path === "/login" ? "login" : "test",
    meta: { requiresAuth, ...extraMeta },
  }) as never;
const run = (guard: ReturnType<typeof createAuthGuard>, target: never) =>
  (guard as unknown as (to: never) => Promise<unknown>)(target);

describe("authGuard", () => {
  it("permite rutas públicas sin esperar la sesión", async () => {
    const initialize = vi.fn();
    expect(
      await run(
        createAuthGuard({ authenticated: false } as never, initialize),
        route("/categoria/joyas"),
      ),
    ).toBe(true);
    expect(initialize).not.toHaveBeenCalled();
  });

  it("protege sesiones ausentes o expiradas conservando fullPath", async () => {
    const initialize = vi.fn().mockResolvedValue(undefined);
    const guard = createAuthGuard({ authenticated: false } as never, initialize);
    expect(await run(guard, route("/pedido?paso=2", true))).toEqual({
      name: "login",
      query: { returnUrl: "/pedido?paso=2" },
      replace: true,
    });
  });

  it("permite una ruta autenticada opcional para el wizard público", async () => {
    const initialize = vi.fn().mockResolvedValue(undefined);

    await expect(
      run(
        createAuthGuard({ authenticated: false } as never, initialize),
        route("/pedido", true, { allowAnonymous: true, roles: [BUYER_ROLE] }),
      ),
    ).resolves.toBe(true);
    expect(initialize).toHaveBeenCalledOnce();
  });

  it("permite sesión vigente y evita bucles en login", async () => {
    const initialize = vi.fn().mockResolvedValue(undefined);
    expect(
      await run(
        createAuthGuard({ authenticated: true } as never, initialize),
        route("/admin", true),
      ),
    ).toBe(true);
    expect(
      await run(createAuthGuard({ authenticated: false } as never, initialize), route("/login")),
    ).toBe(true);
  });

  it("aplica roles específicos y envía a la superficie de permisos insuficientes", async () => {
    const initialize = vi.fn().mockResolvedValue(undefined);
    const hasAnyRole = vi.fn().mockReturnValue(false);
    const guard = createAuthGuard({ authenticated: true, hasAnyRole } as never, initialize);

    await expect(run(guard, route("/admin/products", true, { roles: ADMIN_ROLES }))).resolves.toEqual({
      name: "forbidden",
      replace: true,
    });
    expect(hasAnyRole).toHaveBeenCalledWith(ADMIN_ROLES);
  });

  it("marca solo las superficies privadas acordadas", () => {
    for (const path of ["/admin/products", "/admin/dashboard", "/settings/profile", "/pedido"])
      expect(router.resolve(path).meta.requiresAuth, path).toBe(true);

    expect(router.resolve("/admin/products").meta.roles).toEqual(ADMIN_ROLES);
    expect(router.resolve("/admin/dashboard").meta.roles).toEqual(ADMIN_ROLES);
    expect(router.resolve("/settings/profile").meta.roles).toEqual(ADMIN_ROLES);
    expect(router.resolve("/pedido").meta).toMatchObject({
      allowAnonymous: true,
      roles: [BUYER_ROLE, ...ADMIN_ROLES],
    });
    for (const path of [
      "/categoria/joyas",
      "/categoria/joyas/producto/1",
      "/pedido/seguimiento/token",
      "/pedido/confirmacion/referencia",
      "/auth/callback",
      "/auth/logout-callback",
    ])
      expect(router.resolve(path).meta.requiresAuth, path).not.toBe(true);
    expect(router.resolve("/register").name).toBe("register");
    expect(router.resolve("/register").matched.at(-1)?.redirect).toBeUndefined();
    expect(router.resolve("/forgot-password").matched.at(-1)?.redirect).toEqual({ name: "login" });
  });

  it("completa la navegación mediante una promesa durante una view transition", async () => {
    const startViewTransition = vi.fn((callback: () => void) => callback());
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: startViewTransition,
    });

    await expect(viewTransitionGuard({ path: "/about" }, { path: "/" })).resolves.toBe(true);
    expect(startViewTransition).toHaveBeenCalledOnce();

    Reflect.deleteProperty(document, "startViewTransition");
  });

  it("deduplica por store y permite reintentar si la inicialización falla", async () => {
    const store = {
      authenticated: false,
      initialize: vi.fn().mockRejectedValueOnce(new Error("fallo temporal")).mockResolvedValue(undefined),
    };

    const firstInitialization = initializeAuth(store);
    expect(initializeAuth(store)).toBe(firstInitialization);
    await expect(firstInitialization).rejects.toThrow("fallo temporal");

    await expect(initializeAuth(store)).resolves.toBeUndefined();

    const secondStore = {
      authenticated: false,
      initialize: vi.fn().mockResolvedValue(undefined),
    };
    await initializeAuth(secondStore);

    expect(store.initialize).toHaveBeenCalledTimes(2);
    expect(secondStore.initialize).toHaveBeenCalledOnce();
  });
});
