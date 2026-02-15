/**
 * @fileoverview Implements find endpoint runtime definition.
 */
import type { EndpointRuntimeDefinition } from "./types";

/** Handles match path. */
function matchPath(templatePath: string, requestPath: string): Record<string, string> | null {
  const templateSegments = templatePath.split("/").filter((segment) => segment.length > 0);
  const requestSegments = requestPath.split("/").filter((segment) => segment.length > 0);

  if (templateSegments.length !== requestSegments.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let index = 0; index < templateSegments.length; index += 1) {
    const templateSegment = templateSegments[index] ?? "";
    const requestSegment = requestSegments[index] ?? "";
    const paramMatch = templateSegment.match(/^\{(.+)\}$/);

    if (paramMatch?.[1]) {
      params[paramMatch[1]] = decodeURIComponent(requestSegment);
      continue;
    }

    if (templateSegment !== requestSegment) {
      return null;
    }
  }

  return params;
}

/**
 * Handles find endpoint runtime definition.
 * @param endpoints - Endpoints parameter.
 * @param method - Method parameter.
 * @param path - Path parameter.
 * @example
 * findEndpointRuntimeDefinition(endpoints, method, path)
 */
export function findEndpointRuntimeDefinition(
  endpoints: ReadonlyArray<EndpointRuntimeDefinition>,
  method: string,
  path: string,
):
  | {
      endpoint: EndpointRuntimeDefinition;
      params: Record<string, string>;
    }
  | undefined {
  for (const endpoint of endpoints) {
    if (endpoint.method !== method) {
      continue;
    }

    const params = matchPath(endpoint.path, path);
    if (!params) {
      continue;
    }

    return { endpoint, params };
  }

  return undefined;
}
