/**
 * @fileoverview Implements create client.
 */
import type {
  ClientRequestApi,
  ClientEndpointResponse,
  ClientEndpointUnion,
  ClientRequestInput,
  ClientResponse,
  HttpApiClient,
} from "./types";

type QueryValue = string | number | boolean | null | undefined | Date;
type QueryRecord = Record<string, QueryValue | QueryValue[]>;
const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"] as const;
/** Converts values to base url. */
function toBaseUrl(baseUrl: string): string {
  const normalized = baseUrl.trim();
  if (normalized.length === 0) {
    throw new Error("baseUrl is required");
  }

  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

/** Converts values to resolved path. */
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

/** Converts values to path key. */
function toPathKey(pathKey: string): string {
  const trimmed = pathKey.trim();
  if (trimmed.length === 0) {
    throw new Error("path key is required");
  }

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+/g, "/");
}

/** Handles append query. */
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

/** Converts values to string headers. */
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

/** Converts values to request body. */
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

/** Converts values to response data. */
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

/** Converts values to response headers. */
function toResponseHeaders(headers: Headers): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [name, value] of headers.entries()) {
    normalized[name] = value;
  }
  return normalized;
}

/** Converts values to endpoint list. */
function toEndpointList(
  endpoints: unknown,
): Array<{ method: string; path: string; routeId: string }> {
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

export function createClient<TEndpoints>(
  baseUrl: string,
  endpoints: TEndpoints,
): HttpApiClient<TEndpoints, TEndpoints>;
export function createClient<TEndpoints = never>(
  baseUrl: string,
  endpoints?: undefined,
): HttpApiClient<TEndpoints, TEndpoints>;
export function createClient<TEndpoints, TRouteEndpoints = unknown>(
  baseUrl: string,
  endpoints: TRouteEndpoints,
): HttpApiClient<TEndpoints, TRouteEndpoints>;
/**
 * Creates client.
 * @param baseUrl - Base url parameter.
 * @param endpoints - Endpoints parameter.
 * @example createClient(baseUrl, endpoints)
 */ export function createClient<TEndpoints = never, TRouteEndpoints = TEndpoints>(
  baseUrl: string,
  endpoints?: TRouteEndpoints,
): HttpApiClient<TEndpoints, TRouteEndpoints> {
  const normalizedBaseUrl = toBaseUrl(baseUrl);
  const endpointList = toEndpointList(endpoints);
  const endpointByRouteId = new Map<string, { method: string; path: string; routeId: string }>();
  for (const endpoint of endpointList) {
    endpointByRouteId.set(endpoint.routeId, endpoint);
  }

  /** Handles request core. */ async function requestCore<
    TEndpoint extends ClientEndpointUnion<TEndpoints>,
  >(
    endpoint: TEndpoint,
    input: ClientRequestInput<TEndpoint>,
  ): Promise<ClientResponse<ClientEndpointResponse<TEndpoint>>> {
    const endpointSource = endpoint as {
      method: string;
      path: string;
    };
    const params = (input.params as Record<string, string | number | boolean | undefined>) ?? {};
    const headers = toStringHeaders(input.headers);
    const requestBody = toRequestBody(input.body, headers);
    const url = new URL(toResolvedPath(endpointSource.path, params), `${normalizedBaseUrl}/`);
    appendQuery(url.searchParams, input.query as QueryRecord | undefined);
    const requestInit: RequestInit = {
      headers,
      method: endpointSource.method,
      ...(input.signal ? { signal: input.signal } : {}),
      ...(requestBody === undefined ? {} : { body: requestBody }),
    };

    const response = await fetch(url, requestInit);
    const responseData = await toResponseData(response);

    return {
      data: responseData as ClientEndpointResponse<TEndpoint>,
      headers: toResponseHeaders(response.headers),
      ok: response.ok,
      statusCode: response.status,
    };
  }

  const request = requestCore as ClientRequestApi<TEndpoints, TRouteEndpoints>;
  request.endpoint = requestCore;
  request.byRouteId = async (routeId, input) => {
    const endpoint = endpointByRouteId.get(routeId as string);
    if (!endpoint) {
      throw new Error(`Unknown routeId "${String(routeId)}"`);
    }

    return requestCore(endpoint as ClientEndpointUnion<TEndpoints>, input as never);
  };

  for (const method of HTTP_METHODS) {
    (request as Record<string, unknown>)[method] = new Proxy<Record<string, unknown>>(
      {},
      {
        get(_target, rawPathKey) {
          if (typeof rawPathKey !== "string") {
            return undefined;
          }

          return (input: unknown) => {
            return requestCore(
              {
                method,
                path: toPathKey(rawPathKey),
              } as ClientEndpointUnion<TEndpoints>,
              input as never,
            );
          };
        },
      },
    );
  }

  for (const endpoint of endpointList) {
    const routeId = endpoint.routeId;
    if (!routeId || routeId in request) {
      continue;
    }

    (request as Record<string, unknown>)[routeId] = (input: unknown) => {
      return requestCore(endpoint as ClientEndpointUnion<TEndpoints>, input as never);
    };
  }

  return {
    request: request,
  };
}
