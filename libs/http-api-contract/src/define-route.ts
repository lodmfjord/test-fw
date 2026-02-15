/**
 * @fileoverview Implements define route.
 */
import type { HttpMethod, RouteDefinition, RouteInput } from "./types";
import { toRouteExecution } from "./to-route-execution";

const SUPPORTED_METHODS: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
  "HEAD",
];

/** Runs normalize method. */
function normalizeMethod(method: string): HttpMethod {
  const normalizedMethod = method.trim().toUpperCase();
  if (SUPPORTED_METHODS.includes(normalizedMethod as HttpMethod)) {
    return normalizedMethod as HttpMethod;
  }

  throw new Error(`Unsupported method: ${method}`);
}

/** Runs normalize path. */
function normalizePath(path: string): string {
  const trimmedPath = path.trim();
  if (trimmedPath.length === 0) {
    throw new Error("Path is required");
  }

  const withLeadingSlash = trimmedPath.startsWith("/") ? trimmedPath : `/${trimmedPath}`;
  const segments = withLeadingSlash
    .replace(/\/+/g, "/")
    .split("/")
    .filter((segment) => segment.length > 0)
    .map((segment) => {
      if (segment.startsWith(":")) {
        return `{${segment.slice(1)}}`;
      }

      return segment;
    });

  return segments.length === 0 ? "/" : `/${segments.join("/")}`;
}

/** Runs sanitize segment. */
function sanitizeSegment(segment: string): string {
  return segment
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

/** Converts to route id. */
function toRouteId(method: HttpMethod, path: string): string {
  if (path === "/") {
    return `${method.toLowerCase()}_root`;
  }

  const pathSegments = path
    .slice(1)
    .split("/")
    .map((segment) => {
      const paramMatch = segment.match(/^\{(.+)\}$/);
      if (paramMatch?.[1]) {
        return `param_${sanitizeSegment(paramMatch[1])}`;
      }

      return sanitizeSegment(segment);
    })
    .filter((segment) => segment.length > 0);

  return [method.toLowerCase(), ...pathSegments].join("_");
}

/** Converts to operation id. */
function toOperationId(routeId: string): string {
  const parts = routeId.split("_");
  const head = parts[0] ?? "route";
  const tail = parts
    .slice(1)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join("");

  return `${head}${tail}`;
}

/** Converts to route env. */
function toRouteEnv(input: RouteInput["env"]): Record<string, string> | undefined {
  if (!input || input.length === 0) {
    return undefined;
  }

  const env: Record<string, string> = {};
  for (const source of input) {
    for (const [name, value] of Object.entries(source)) {
      const normalizedName = name.trim();
      if (normalizedName.length === 0) {
        throw new Error("Environment variable name is required");
      }

      env[normalizedName] = value;
    }
  }

  return Object.keys(env).length > 0 ? env : undefined;
}

/**
 * Defines route.
 * @param input - Input parameter.
 * @example
 * defineRoute(input)
 * @returns Output value.
 * @throws Error when operation fails.
 */
export function defineRoute(input: RouteInput): RouteDefinition {
  const method = normalizeMethod(input.method);
  const path = normalizePath(input.path);
  const routeId = toRouteId(method, path);

  const handler = input.handler.trim();
  if (handler.length === 0) {
    throw new Error("Handler is required");
  }

  const tags = input.tags ? [...input.tags] : [];
  const execution = toRouteExecution(input.execution);
  const env = toRouteEnv(input.env);

  return {
    auth: input.auth ?? "none",
    ...(input.aws ? { aws: { ...input.aws } } : {}),
    ...(input.description ? { description: input.description } : {}),
    ...(env ? { env } : {}),
    execution,
    handler,
    method,
    operationId: input.operationId ?? toOperationId(routeId),
    path,
    routeId,
    ...(input.summary ? { summary: input.summary } : {}),
    tags,
  };
}
