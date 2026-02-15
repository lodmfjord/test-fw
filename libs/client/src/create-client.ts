/**
 * @fileoverview Implements create client.
 */
import { createClientHelpers } from "./create-client-helpers";
import type {
  ClientEndpointResponse,
  ClientEndpointUnion,
  ClientRequestApi,
  ClientRequestInput,
  ClientResponse,
  HttpApiClient,
} from "./types";

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"] as const;

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
 * @example
 * createClient(baseUrl, endpoints)
 * @returns Output value.
 */
export function createClient<TEndpoints = never, TRouteEndpoints = TEndpoints>(
  baseUrl: string,
  endpoints?: TRouteEndpoints,
): HttpApiClient<TEndpoints, TRouteEndpoints> {
  const clientHelpers = createClientHelpers();
  const normalizedBaseUrl = clientHelpers.toBaseUrl(baseUrl);
  const endpointList = clientHelpers.toEndpointList(endpoints);
  const endpointByRouteId = new Map<string, { method: string; path: string; routeId: string }>();
  for (const endpoint of endpointList) {
    endpointByRouteId.set(endpoint.routeId, endpoint);
  }

  /** Runs request core. */
  async function requestCore<TEndpoint extends ClientEndpointUnion<TEndpoints>>(
    endpoint: TEndpoint,
    input: ClientRequestInput<TEndpoint>,
  ): Promise<ClientResponse<ClientEndpointResponse<TEndpoint>>> {
    const endpointSource = endpoint as { method: string; path: string };
    const params = (input.params as Record<string, string | number | boolean | undefined>) ?? {};
    const headers = clientHelpers.toStringHeaders(input.headers);
    const requestBody = clientHelpers.toRequestBody(input.body, headers);
    const url = new URL(
      clientHelpers.toResolvedPath(endpointSource.path, params),
      `${normalizedBaseUrl}/`,
    );
    clientHelpers.appendQuery(
      url.searchParams,
      input.query as Parameters<typeof clientHelpers.appendQuery>[1],
    );

    const requestInit: RequestInit = {
      headers,
      method: endpointSource.method,
      ...(input.signal ? { signal: input.signal } : {}),
      ...(requestBody === undefined ? {} : { body: requestBody }),
    };
    const response = await fetch(url, requestInit);

    return {
      data: (await clientHelpers.toResponseData(response)) as ClientEndpointResponse<TEndpoint>,
      headers: clientHelpers.toResponseHeaders(response.headers),
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

    return requestCore(
      endpoint as ClientEndpointUnion<TEndpoints>,
      input as ClientRequestInput<ClientEndpointUnion<TEndpoints>>,
    );
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
                path: clientHelpers.toPathKey(rawPathKey),
              } as ClientEndpointUnion<TEndpoints>,
              input as ClientRequestInput<ClientEndpointUnion<TEndpoints>>,
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
      return requestCore(
        endpoint as ClientEndpointUnion<TEndpoints>,
        input as ClientRequestInput<ClientEndpointUnion<TEndpoints>>,
      );
    };
  }

  return {
    request,
  };
}
