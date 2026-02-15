/**
 * @fileoverview Implements assert unique route ids.
 */
type RouteIdentity = {
  method: string;
  path: string;
  routeId: string;
};

/** Checks whether same route. */
function isSameRoute(left: RouteIdentity, right: RouteIdentity): boolean {
  return left.method === right.method && left.path === right.path;
}

/**
 * Handles assert unique route ids.
 * @param routes - Routes parameter.
 * @example
 * assertUniqueRouteIds(routes)
 */
export function assertUniqueRouteIds(routes: ReadonlyArray<RouteIdentity>): void {
  const routeById = new Map<string, RouteIdentity>();

  for (const route of routes) {
    const existing = routeById.get(route.routeId);
    if (!existing) {
      routeById.set(route.routeId, route);
      continue;
    }

    if (isSameRoute(existing, route)) {
      continue;
    }

    throw new Error(
      `Route ID collision: "${route.routeId}" is shared by ${existing.method} ${existing.path} and ${route.method} ${route.path}`,
    );
  }
}
