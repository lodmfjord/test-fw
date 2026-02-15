/**
 * @fileoverview Implements create client helper utilities.
 */

type QueryValue = string | number | boolean | null | undefined | Date;
type QueryRecord = Record<string, QueryValue | QueryValue[]>;
type EndpointDescriptor = {
  method: string;
  path: string;
  routeId: string;
};

/** Converts to base url. */
function toBaseUrl(baseUrl: string): string {
  const normalized = baseUrl.trim();
  if (normalized.length === 0) {
    throw new Error("baseUrl is required");
  }

  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

/** Converts to resolved path. */
function toResolvedPath(
  pathTemplate: string,
  params: Record<string, string | number | boolean | undefined>,
): string {
  return pathTemplate.replace(/\{([^}]+)\}/g, (_rawMatch, rawName: string) => {
    const name = rawName.trim();
    const value = params[name];
    if (value === undefined) {
      throw new Error(`Missing path param "${name}" for path "${pathTemplate}"`);
    }

    return encodeURIComponent(String(value));
  });
}

/** Converts to path key. */
function toPathKey(pathKey: string): string {
  const trimmed = pathKey.trim();
  if (trimmed.length === 0) {
    throw new Error("path key is required");
  }

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+/g, "/");
}

/** Runs append query. */
function appendQuery(searchParams: URLSearchParams, query: QueryRecord | undefined): void {
  if (!query || typeof query !== "object") {
    return;
  }

  for (const [name, rawValue] of Object.entries(query)) {
    if (rawValue === undefined || rawValue === null) {
      continue;
    }

    if (Array.isArray(rawValue)) {
      for (const value of rawValue) {
        if (value === undefined || value === null) {
          continue;
        }

        searchParams.append(name, value instanceof Date ? value.toISOString() : String(value));
      }
      continue;
    }

    searchParams.append(name, rawValue instanceof Date ? rawValue.toISOString() : String(rawValue));
  }
}

/** Converts to string headers. */
function toStringHeaders(headers: unknown): Record<string, string> {
  if (!headers || typeof headers !== "object" || Array.isArray(headers)) {
    return {};
  }

  const normalized: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined || value === null) {
      continue;
    }

    normalized[name] = String(value);
  }

  return normalized;
}

/** Checks whether has header. */
function hasHeader(headers: Record<string, string>, expectedName: string): boolean {
  const normalizedExpectedName = expectedName.toLowerCase();
  return Object.keys(headers).some((name) => name.toLowerCase() === normalizedExpectedName);
}

/** Converts to request body. */
function toRequestBody(body: unknown, headers: Record<string, string>): BodyInit | undefined {
  if (body === undefined) {
    return undefined;
  }

  if (
    typeof body === "string" ||
    body instanceof ArrayBuffer ||
    body instanceof Blob ||
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof ReadableStream
  ) {
    return body;
  }

  if (!hasHeader(headers, "content-type")) {
    headers["content-type"] = "application/json";
  }

  return JSON.stringify(body);
}

/** Converts to response data. */
async function toResponseData(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.includes("/json") || contentType.includes("+json")) {
    const text = await response.text();
    if (text.trim().length === 0) {
      return undefined;
    }

    return JSON.parse(text) as unknown;
  }

  return (await response.text()) as unknown;
}

/** Converts to response headers. */
function toResponseHeaders(headers: Headers): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [name, value] of headers.entries()) {
    normalized[name] = value;
  }

  return normalized;
}

/** Converts to endpoint list. */
function toEndpointList(endpoints: unknown): EndpointDescriptor[] {
  if (!endpoints) {
    return [];
  }

  if (Array.isArray(endpoints)) {
    return endpoints.flatMap((item) => toEndpointList(item));
  }

  if (
    typeof endpoints === "object" &&
    endpoints !== null &&
    "method" in endpoints &&
    "path" in endpoints &&
    "routeId" in endpoints
  ) {
    const endpoint = endpoints as {
      method: unknown;
      path: unknown;
      routeId: unknown;
    };
    if (
      typeof endpoint.method === "string" &&
      typeof endpoint.path === "string" &&
      typeof endpoint.routeId === "string"
    ) {
      return [
        {
          method: endpoint.method,
          path: endpoint.path,
          routeId: endpoint.routeId,
        },
      ];
    }
  }

  return [];
}

const clientHelpers = {
  appendQuery,
  toBaseUrl,
  toEndpointList,
  toPathKey,
  toRequestBody,
  toResolvedPath,
  toResponseData,
  toResponseHeaders,
  toStringHeaders,
};

/**
 * Builds the local helper API used by createClient.
 * @example
 * const helpers = createClientHelpers();
 * @returns Reusable helper functions for client creation.
 */
export function createClientHelpers() {
  return clientHelpers;
}
