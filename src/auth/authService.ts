import type { User } from "oidc-client-ts";
import { getUserManager } from "@/auth/oidcClient";

export const ADMIN_RETURN_URL = "/admin/products";
export const REGISTER_RETURN_URL = "/";

export function sanitizeReturnUrl(
  returnUrl: unknown,
  fallback: string = ADMIN_RETURN_URL,
): string {
  if (typeof returnUrl !== "string" || !returnUrl.startsWith("/") || returnUrl.startsWith("//")) {
    return fallback;
  }

  try {
    const safeOrigin = "https://return-url.local";
    return new URL(returnUrl, safeOrigin).origin === safeOrigin ? returnUrl : fallback;
  } catch {
    return fallback;
  }
}

interface UserManagerEventAdapter {
  addUserLoaded(callback: (user: User) => void): unknown;
  removeUserLoaded(callback: (user: User) => void): void;
  addUserUnloaded(callback: () => void): unknown;
  removeUserUnloaded(callback: () => void): void;
  addAccessTokenExpired(callback: () => void): unknown;
  removeAccessTokenExpired(callback: () => void): void;
}

export interface UserManagerAdapter {
  getUser(): Promise<User | null>;
  signinRedirect(args: {
    state: { returnUrl: string };
    extraQueryParams?: Record<string, string>;
  }): Promise<void>;
  signinRedirectCallback(): Promise<User>;
  signoutRedirect(): Promise<void>;
  signoutRedirectCallback(): Promise<unknown>;
  removeUser(): Promise<void>;
  clearStaleState(): Promise<void>;
  events: UserManagerEventAdapter;
}

export interface AuthEventHandlers {
  userLoaded(user: User): void;
  userUnloaded(): void;
  accessTokenExpired(): void;
}

export interface SigninCallbackResult {
  user: User;
  returnUrl: string;
}

export interface AuthServicePort {
  getUser(): Promise<User | null>;
  getAccessToken(): Promise<string | null>;
  signin(returnUrl?: unknown): Promise<void>;
  register(returnUrl?: unknown): Promise<void>;
  signinCallback(): Promise<SigninCallbackResult>;
  signout(): Promise<void>;
  signoutCallback(): Promise<void>;
  cleanup(): Promise<void>;
  subscribeToUserEvents(handlers: AuthEventHandlers): () => void;
}

function callbackReturnUrl(user: User): unknown {
  if (!user.state || typeof user.state !== "object" || !("returnUrl" in user.state)) {
    return undefined;
  }

  return user.state.returnUrl;
}

export class AuthService implements AuthServicePort {
  constructor(private readonly managerFactory: () => UserManagerAdapter = getUserManager) {}

  private get manager(): UserManagerAdapter {
    return this.managerFactory();
  }

  getUser(): Promise<User | null> {
    return this.manager.getUser();
  }

  async getAccessToken(): Promise<string | null> {
    const user = await this.getUser();
    return user?.expired === false && user.access_token ? user.access_token : null;
  }

  signin(returnUrl?: unknown): Promise<void> {
    return this.manager.signinRedirect({
      state: { returnUrl: sanitizeReturnUrl(returnUrl) },
    });
  }

  register(returnUrl?: unknown): Promise<void> {
    // Registration starts the same authorization-code + PKCE request as
    // login. The STS consumes this marker and renders its hosted form while
    // preserving the authorization transaction in `returnUrl`.
    return this.manager.signinRedirect({
      state: { returnUrl: sanitizeReturnUrl(returnUrl, REGISTER_RETURN_URL) },
      extraQueryParams: { acr_values: "registration" },
    });
  }

  async signinCallback(): Promise<SigninCallbackResult> {
    const user = await this.manager.signinRedirectCallback();
    return {
      user,
      returnUrl: sanitizeReturnUrl(callbackReturnUrl(user)),
    };
  }

  signout(): Promise<void> {
    return this.manager.signoutRedirect();
  }

  async signoutCallback(): Promise<void> {
    await this.manager.signoutRedirectCallback();
    await this.cleanup();
  }

  async cleanup(): Promise<void> {
    await this.manager.removeUser();
    await this.manager.clearStaleState();
  }

  subscribeToUserEvents(handlers: AuthEventHandlers): () => void {
    const events = this.manager.events;
    events.addUserLoaded(handlers.userLoaded);
    events.addUserUnloaded(handlers.userUnloaded);
    events.addAccessTokenExpired(handlers.accessTokenExpired);

    return () => {
      events.removeUserLoaded(handlers.userLoaded);
      events.removeUserUnloaded(handlers.userUnloaded);
      events.removeAccessTokenExpired(handlers.accessTokenExpired);
    };
  }
}

export const authService: AuthServicePort = new AuthService();
