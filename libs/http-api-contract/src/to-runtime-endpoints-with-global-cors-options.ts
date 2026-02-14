import { schema } from "@babbstack/schema";
import type { GlobalCors } from "./cors-types";
import type { Contract, EndpointRuntimeDefinition } from "./types";

function toCorsHeaders(cors: GlobalCors, methods: string[]): Record<string, string> {
  return {
    ...(cors.allowCredentials ? { "access-control-allow-credentials": "true" } : {}),
    "access-control-allow-headers": cors.allowHeaders?.join(",") ?? "*",
    "access-control-allow-methods": methods.join(","),
    "access-control-allow-origin": cors.allowOrigin,
    ...(cors.exposeHeaders?.length
      ? {
          "access-control-expose-headers": cors.exposeHeaders.join(","),
        }
      : {}),
    ...(cors.maxAgeSeconds !== undefined
      ? {
          "access-control-max-age": String(cors.maxAgeSeconds),
        }
      : {}),
  };
}

function toMethodsByPath(contract: Contract): Map<string, Set<string>> {
  const methodsByPath = new Map<string, Set<string>>();

  for (const route of contract.routesManifest.routes) {
    const methods = methodsByPath.get(route.path) ?? new Set<string>();
    methods.add(route.method);
    methodsByPath.set(route.path, methods);
  }

  return methodsByPath;
}

export function toRuntimeEndpointsWithGlobalCorsOptions(
  contract: Contract,
  endpoints: ReadonlyArray<EndpointRuntimeDefinition>,
): EndpointRuntimeDefinition[] {
  const cors = contract.deployContract.apiGateway.cors;
  if (!cors) {
    return [...endpoints];
  }

  const methodsByPath = toMethodsByPath(contract);
  const endpointsWithOptions = [...endpoints];
  const existingRouteKeys = new Set(
    endpointsWithOptions.map((endpoint) => `${endpoint.method}:${endpoint.path}`),
  );

  for (const route of contract.routesManifest.routes) {
    if (route.method !== "OPTIONS") {
      continue;
    }

    const routeKey = `${route.method}:${route.path}`;
    if (existingRouteKeys.has(routeKey)) {
      continue;
    }

    const methods = [...(methodsByPath.get(route.path) ?? new Set(["OPTIONS"]))].sort((a, b) =>
      a.localeCompare(b),
    );
    if (!methods.includes("OPTIONS")) {
      methods.push("OPTIONS");
    }

    endpointsWithOptions.push({
      auth: route.auth,
      ...(route.aws ? { aws: { ...route.aws } } : {}),
      ...(route.description ? { description: route.description } : {}),
      handler: () => ({
        headers: toCorsHeaders(cors, methods),
        statusCode: 204,
        value: {},
      }),
      handlerId: route.handler,
      method: route.method,
      operationId: route.operationId,
      path: route.path,
      request: {},
      response: schema.object({}),
      routeId: route.routeId,
      ...(route.summary ? { summary: route.summary } : {}),
      tags: [...route.tags],
    });
  }

  return endpointsWithOptions;
}
