import type { HttpMethod, RouteDefinition, RouteInput } from "./types";

const SUPPORTED_METHODS: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
  "HEAD",
];

function normalizeMethod(method: string): HttpMethod {
  const normalizedMethod = method.trim().toUpperCase();
  if (SUPPORTED_METHODS.includes(normalizedMethod as HttpMethod)) {
    return normalizedMethod as HttpMethod;
  }

  throw new Error(`Unsupported method: ${method}`);
}

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

function sanitizeSegment(segment: string): string {
  return segment
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

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

function toOperationId(routeId: string): string {
  const parts = routeId.split("_");
  const head = parts[0] ?? "route";
  const tail = parts
    .slice(1)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join("");

  return `${head}${tail}`;
}

export function defineRoute(input: RouteInput): RouteDefinition {
  const method = normalizeMethod(input.method);
  const path = normalizePath(input.path);
  const routeId = toRouteId(method, path);

  const handler = input.handler.trim();
  if (handler.length === 0) {
    throw new Error("Handler is required");
  }

  const tags = input.tags ? [...input.tags] : [];

  return {
    auth: input.auth ?? "none",
    ...(input.aws ? { aws: { ...input.aws } } : {}),
    ...(input.description ? { description: input.description } : {}),
    handler,
    method,
    operationId: input.operationId ?? toOperationId(routeId),
    path,
    routeId,
    ...(input.summary ? { summary: input.summary } : {}),
    tags,
  };
}
