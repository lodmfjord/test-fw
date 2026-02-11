import { endpointRegistry } from "./endpoint-registry-store";
import type { EndpointRuntimeDefinition } from "./types";

export function listDefinedEndpoints(): EndpointRuntimeDefinition[] {
  return endpointRegistry.map((endpoint) => ({
    ...endpoint,
    request: {
      ...(endpoint.request.body ? { body: endpoint.request.body } : {}),
      ...(endpoint.request.headers ? { headers: endpoint.request.headers } : {}),
      ...(endpoint.request.params ? { params: endpoint.request.params } : {}),
      ...(endpoint.request.query ? { query: endpoint.request.query } : {}),
    },
    response: endpoint.response,
    handler: endpoint.handler,
  }));
}
