import { endpointRegistry } from "./endpoint-registry-store";
import type { EndpointRuntimeDefinition } from "./types";

export function registerDefinedEndpoint(endpoint: EndpointRuntimeDefinition): void {
  const existingIndex = endpointRegistry.findIndex((entry) => {
    return entry.method === endpoint.method && entry.path === endpoint.path;
  });

  if (existingIndex >= 0) {
    endpointRegistry[existingIndex] = endpoint;
    return;
  }

  endpointRegistry.push(endpoint);
}
