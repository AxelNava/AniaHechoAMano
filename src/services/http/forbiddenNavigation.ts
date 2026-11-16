/**
 * Decisión de navegación ante una respuesta 403 de la API.
 *
 * Un 403 puntual no implica que la ruta actual sea ilegal para la sesión: la API
 * puede rechazar una función concreta (por ejemplo, un feature flag apagado) en
 * una pantalla que el guard del router ya autorizó. Solo se navega a
 * `/sin-permisos` cuando la ruta actual exige un rol que la sesión no tiene,
 * leyendo el mismo contrato que el guard del router (`@/auth/routeRoles`).
 */

import { routeRequiredRoles } from "@/auth/routeRoles";

export const FORBIDDEN_ROUTE_NAME = "forbidden";

export interface ForbiddenRouteMeta {
  [key: string]: unknown;
  requiresAuth?: unknown;
  roles?: unknown;
  requiredRoles?: unknown;
}

export interface ForbiddenRouteState {
  name?: unknown;
  meta?: ForbiddenRouteMeta | undefined;
}

export interface ForbiddenAuthState {
  authenticated: boolean;
  hasAnyRole?: (requiredRoles: readonly string[]) => boolean;
}

export function shouldNavigateToForbidden(
  route: ForbiddenRouteState,
  auth: ForbiddenAuthState,
): boolean {
  if (route.name === FORBIDDEN_ROUTE_NAME) return false;
  if (route.meta?.requiresAuth !== true) return false;
  if (auth.authenticated !== true) return false;

  const requiredRoles = routeRequiredRoles(route);
  if (requiredRoles === undefined) return false;

  return auth.hasAnyRole?.(requiredRoles) !== true;
}
