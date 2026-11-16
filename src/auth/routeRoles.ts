/**
 * Contrato de roles que exige una ruta.
 *
 * Vive en un módulo neutral y no dentro del guard porque lo consumen dos
 * decisiones distintas: el guard de navegación y la reacción a un 403 de la API.
 * Con una sola lectura, ambas no pueden divergir.
 */

export interface RoleGuardedRoute {
  meta?:
    | {
        roles?: unknown;
        requiredRoles?: unknown;
        [key: string]: unknown;
      }
    | undefined;
}

/**
 * Roles exigidos por la ruta: `roles` manda sobre `requiredRoles` y una
 * configuración que no sea array equivale a "sin requisito de rol". Un array sin
 * entradas utilizables se devuelve vacío, de modo que ninguna ruta queda
 * cubierta por una lista que en realidad no autoriza a nadie.
 */
export const routeRequiredRoles = (
  to: RoleGuardedRoute,
): readonly string[] | undefined => {
  const configuredRoles = to.meta?.roles ?? to.meta?.requiredRoles;
  if (!Array.isArray(configuredRoles)) return undefined;

  return configuredRoles.filter(
    (role): role is string => typeof role === "string" && role.trim().length > 0,
  );
};
