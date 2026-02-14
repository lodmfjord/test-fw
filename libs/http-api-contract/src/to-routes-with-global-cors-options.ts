import type { GlobalCors } from "./cors-types";
import { defineRoute } from "./define-route";
import type { RouteDefinition } from "./types";

function toRouteCopy(route: RouteDefinition): RouteDefinition {
  return {
    ...route,
    ...(route.aws ? { aws: { ...route.aws } } : {}),
    tags: [...route.tags],
  };
}

export function toRoutesWithGlobalCorsOptions(
  routes: ReadonlyArray<RouteDefinition>,
  cors: GlobalCors | undefined,
): RouteDefinition[] {
  if (!cors) {
    return routes.map((route) => toRouteCopy(route));
  }

  const routesWithCorsOptions = routes.map((route) => toRouteCopy(route));
  const methodsByPath = new Map<string, Set<string>>();
  const hasOptionsByPath = new Set<string>();

  for (const route of routes) {
    if (route.method === "OPTIONS") {
      hasOptionsByPath.add(route.path);
      continue;
    }

    const existingMethods = methodsByPath.get(route.path) ?? new Set<string>();
    existingMethods.add(route.method);
    methodsByPath.set(route.path, existingMethods);
  }

  const paths = [...methodsByPath.keys()].sort((left, right) => left.localeCompare(right));
  for (const path of paths) {
    if (hasOptionsByPath.has(path)) {
      continue;
    }

    const optionsRoute = defineRoute({
      handler: "cors_options_handler",
      method: "OPTIONS",
      path,
    });
    routesWithCorsOptions.push({
      ...optionsRoute,
      handler: `${optionsRoute.routeId}_handler`,
    });
  }

  return routesWithCorsOptions;
}
