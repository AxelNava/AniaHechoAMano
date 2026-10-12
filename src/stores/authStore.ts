import { computed, shallowRef } from "vue";
import { defineStore } from "pinia";
import type { User, UserProfile } from "oidc-client-ts";
import { authService, type AuthServicePort, type SigninCallbackResult } from "@/auth/authService";
import { eliminarBorradorPedidoCliente } from "@/stores/pedidoClienteStore";

export interface AuthStoreUser {
  profile: UserProfile;
}

export const ADMIN_ROLES = ["admin", "AdminAniaIdentity"] as const;
export const BUYER_ROLE = "comprador" as const;

export const normalizeRoleClaims = (profile: UserProfile | null): readonly string[] => {
  if (!profile) return [];

  const claims = profile as UserProfile & {
    role?: unknown;
    roles?: unknown;
  };

  const normalizeClaim = (value: unknown): string[] => {
    if (typeof value === "string") {
      return value
        .split(/[\s,]+/)
        .map((role) => role.trim())
        .filter(Boolean);
    }

    if (Array.isArray(value)) return value.flatMap(normalizeClaim);
    return [];
  };

  return [...new Set([claims.role, claims.roles].flatMap(normalizeClaim))];
};

const AUTH_INITIALIZATION_ERROR = "No se pudo cargar la sesión. Inténtalo de nuevo.";

export function createAuthStore(service: AuthServicePort) {
  return defineStore("auth", () => {
    const user = shallowRef<AuthStoreUser | null>(null);
    const loading = shallowRef(false);
    const initializationState = shallowRef(false);
    const initialized = computed(() => initializationState.value);
    const error = shallowRef<string | null>(null);
    const authenticated = computed(() => user.value !== null);
    const profile = computed(() => user.value?.profile ?? null);
    const roles = computed(() => normalizeRoleClaims(profile.value));
    const roleKeys = computed(() => new Set(roles.value.map((role) => role.toLowerCase())));
    function hasAnyRole(requiredRoles: readonly string[] | string): boolean {
      const candidates = typeof requiredRoles === "string" ? [requiredRoles] : requiredRoles;
      return candidates.some((role) => {
        const key = role.trim().toLowerCase();
        return key.length > 0 && roleKeys.value.has(key);
      });
    }

    const isAdmin = computed(() => hasAnyRole(ADMIN_ROLES));
    const isBuyer = computed(() => hasAnyRole([BUYER_ROLE]));
    let unsubscribeEvents: (() => void) | undefined;

    function applyUser(oidcUser: User | null): void {
      if (oidcUser?.expired === false) {
        user.value = { profile: { ...oidcUser.profile } };
      } else if (oidcUser?.expired === true) {
        clearSession();
      } else {
        clearUser();
      }
    }

    function clearUser(): void {
      user.value = null;
    }

    function clearSession(): void {
      clearUser();
      eliminarBorradorPedidoCliente();
    }

    function startEventSynchronization(): void {
      if (unsubscribeEvents) return;

      unsubscribeEvents = service.subscribeToUserEvents({
        userLoaded: applyUser,
        userUnloaded: clearSession,
        accessTokenExpired: clearSession,
      });
    }

    function stopEventSynchronization(): void {
      unsubscribeEvents?.();
      unsubscribeEvents = undefined;
    }

    async function initialize(): Promise<void> {
      loading.value = true;
      initializationState.value = false;
      error.value = null;

      try {
        try {
          startEventSynchronization();
        } catch {
          error.value = AUTH_INITIALIZATION_ERROR;
        }

        try {
          applyUser(await service.getUser());
        } catch {
          clearUser();
          error.value = AUTH_INITIALIZATION_ERROR;
        }
      } finally {
        loading.value = false;
        initializationState.value = true;
      }
    }

    async function signin(returnUrl?: unknown): Promise<void> {
      loading.value = true;
      error.value = null;

      try {
        await service.signin(returnUrl);
      } catch {
        loading.value = false;
        error.value = "No se pudo iniciar sesión. Inténtalo de nuevo.";
      }
    }

    async function register(returnUrl?: unknown): Promise<void> {
      loading.value = true;
      error.value = null;

      try {
        await service.register(returnUrl);
      } catch {
        loading.value = false;
        error.value = "No se pudo abrir el registro. Inténtalo de nuevo.";
      }
    }

    async function signinCallback(): Promise<string> {
      loading.value = true;
      error.value = null;

      try {
        const result: SigninCallbackResult = await service.signinCallback();
        applyUser(result.user);
        return result.returnUrl;
      } catch {
        clearUser();
        error.value = "No se pudo completar el inicio de sesión. Inténtalo de nuevo.";
        throw new Error(error.value);
      } finally {
        loading.value = false;
      }
    }

    async function signout(): Promise<void> {
      loading.value = true;
      error.value = null;
      clearSession();

      try {
        await service.signout();
      } catch {
        loading.value = false;
        error.value = "No se pudo cerrar sesión. Inténtalo de nuevo.";
      }
    }

    async function signoutCallback(): Promise<void> {
      loading.value = true;
      error.value = null;
      clearSession();

      try {
        await service.signoutCallback();
      } catch {
        error.value = "No se pudo completar el cierre de sesión. Inténtalo de nuevo.";
      } finally {
        loading.value = false;
      }
    }

    async function cleanup(): Promise<void> {
      try {
        await service.cleanup();
      } finally {
        clearSession();
      }
    }

    return {
      user,
      loading,
      initialized,
      error,
      authenticated,
      profile,
      roles,
      isAdmin,
      isBuyer,
      hasAnyRole,
      initialize,
      signin,
      register,
      signinCallback,
      signout,
      signoutCallback,
      cleanup,
      startEventSynchronization,
      stopEventSynchronization,
    };
  });
}

export const useAuthStore = createAuthStore(authService);
