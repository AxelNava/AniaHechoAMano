import type { NavigationGuard, RouteLocationNormalized } from "vue-router";
import { useAuthStore } from "@/stores/authStore";

export interface AuthState {
  authenticated: boolean;
  initialize(): Promise<void>;
  hasAnyRole?(requiredRoles: readonly string[]): boolean;
}

const initializations = new WeakMap<AuthState, Promise<void>>();

export function initializeAuth(store: AuthState = useAuthStore()): Promise<void> {
  const existingInitialization = initializations.get(store);
  if (existingInitialization) return existingInitialization;

  let initialization: Promise<void>;
  try {
    initialization = Promise.resolve(store.initialize());
  } catch (error) {
    return Promise.reject(error);
  }

  initializations.set(store, initialization);
  void initialization.catch(() => {
    if (initializations.get(store) === initialization) initializations.delete(store);
  });

  return initialization;
}

const routeRequiredRoles = (
  to: RouteLocationNormalized,
): readonly string[] | undefined => {
  const configuredRoles = to.meta.roles ?? to.meta.requiredRoles;
  if (!Array.isArray(configuredRoles)) return undefined;

  return configuredRoles.filter(
    (role): role is string => typeof role === "string" && role.trim().length > 0,
  );
};

export function createAuthGuard(
  store?: AuthState,
  ensureInitialized?: () => Promise<void>,
): NavigationGuard {
  return async (to: RouteLocationNormalized) => {
    if (!to.meta.requiresAuth) return true;

    const auth = store ?? useAuthStore();
    await (ensureInitialized?.() ?? initializeAuth(auth));

    if (!auth.authenticated) {
      if (to.meta.allowAnonymous === true) return true;
      return {
        name: "login",
        query: { returnUrl: to.fullPath },
        replace: true,
      };
    }

    const requiredRoles = routeRequiredRoles(to);
    if (requiredRoles === undefined || auth.hasAnyRole?.(requiredRoles) === true) return true;

    return {
      name: "forbidden",
      replace: true,
    };
  };
}
