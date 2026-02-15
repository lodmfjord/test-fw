/** @fileoverview Implements register defined endpoint. @module libs/http-api-contract/src/register-defined-endpoint */
import { assertUniqueRouteIds } from "./assert-unique-route-ids";
import { endpointRegistry } from "./endpoint-registry-store";
import type { EndpointRuntimeDefinition } from "./types";

/** Registers defined endpoint. @example `registerDefinedEndpoint(input)` */
export function registerDefinedEndpoint(endpoint: EndpointRuntimeDefinition): void {
  const existingIndex = endpointRegistry.findIndex((entry) => {
    return entry.method === endpoint.method && entry.path === endpoint.path;
  });

  const nextRegistry = [...endpointRegistry];
  if (existingIndex >= 0) {
    nextRegistry[existingIndex] = endpoint;
  } else {
    nextRegistry.push(endpoint);
  }

  assertUniqueRouteIds(nextRegistry);

  if (existingIndex >= 0) {
    endpointRegistry[existingIndex] = endpoint;
    return;
  }

  endpointRegistry.push(endpoint);
}
