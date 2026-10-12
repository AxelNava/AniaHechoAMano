import { UserManager, WebStorageStateStore, type UserManagerSettings } from "oidc-client-ts";

const REQUIRED_ENVIRONMENT_KEYS = [
  "VITE_API_BASE_URL",
  "VITE_OIDC_AUTHORITY",
  "VITE_OIDC_CLIENT_ID",
  "VITE_OIDC_SCOPE",
  "VITE_OIDC_REDIRECT_URI",
  "VITE_OIDC_POST_LOGOUT_REDIRECT_URI",
] as const;

type EnvironmentKey = (typeof REQUIRED_ENVIRONMENT_KEYS)[number];
type EnvironmentSource = Partial<Record<EnvironmentKey, string | undefined>>;

export function buildManageUrl(authority: unknown): string | null {
  if (typeof authority !== "string" || authority.trim().length === 0) return null;

  try {
    const url = new URL("/Manage", authority.trim());

    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (url.username || url.password) return null;

    return url.toString();
  } catch {
    return null;
  }
}

export interface FrontendEnvironment {
  apiBaseUrl: string;
  authority: string;
  clientId: string;
  scope: string;
  redirectUri: string;
  postLogoutRedirectUri: string;
}

export function readFrontendEnvironment(source: EnvironmentSource): FrontendEnvironment {
  const missing = REQUIRED_ENVIRONMENT_KEYS.filter((key) => !source[key]?.trim());

  if (missing.length > 0) {
    throw new Error(`Faltan variables de entorno requeridas: ${missing.join(", ")}.`);
  }

  const scope = source.VITE_OIDC_SCOPE!.trim();

  if (!scope.split(/\s+/).includes("roles")) {
    throw new Error(
      'VITE_OIDC_SCOPE debe incluir el scope exacto "roles", ya que las claims de rol de las rutas son requeridas.',
    );
  }

  return {
    apiBaseUrl: source.VITE_API_BASE_URL!.trim(),
    authority: source.VITE_OIDC_AUTHORITY!.trim(),
    clientId: source.VITE_OIDC_CLIENT_ID!.trim(),
    scope,
    redirectUri: source.VITE_OIDC_REDIRECT_URI!.trim(),
    postLogoutRedirectUri: source.VITE_OIDC_POST_LOGOUT_REDIRECT_URI!.trim(),
  };
}

export function createOidcSettings(
  source: EnvironmentSource,
  userStorage: Storage,
  stateStorage: Storage,
): UserManagerSettings {
  const environment = readFrontendEnvironment(source);

  return {
    authority: environment.authority,
    client_id: environment.clientId,
    redirect_uri: environment.redirectUri,
    post_logout_redirect_uri: environment.postLogoutRedirectUri,
    response_type: "code",
    scope: environment.scope,
    userStore: new WebStorageStateStore({ store: userStorage }),
    stateStore: new WebStorageStateStore({ store: stateStorage }),
    loadUserInfo: false,
    automaticSilentRenew: false,
    monitorSession: false,
  };
}

export function createUserManager(
  source: EnvironmentSource,
  userStorage: Storage,
  stateStorage: Storage,
): UserManager {
  return new UserManager(createOidcSettings(source, userStorage, stateStorage));
}

let userManager: UserManager | undefined;

export function getUserManager(): UserManager {
  if (userManager) return userManager;

  if (typeof window === "undefined") {
    throw new Error("El almacenamiento del navegador no está disponible para iniciar sesión.");
  }

  const userStorage = window.localStorage;
  if (!userStorage) {
    throw new Error("El almacenamiento local no está disponible para restaurar la sesión.");
  }

  const stateStorage = window.sessionStorage;
  if (!stateStorage) {
    throw new Error("El almacenamiento de sesión no está disponible para iniciar sesión.");
  }

  userManager = createUserManager(import.meta.env, userStorage, stateStorage);
  return userManager;
}
