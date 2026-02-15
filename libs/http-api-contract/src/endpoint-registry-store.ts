/** @fileoverview Implements endpoint registry store. @module libs/http-api-contract/src/endpoint-registry-store */
import type { EndpointRuntimeDefinition } from "./types";

const ENDPOINT_REGISTRY_KEY = Symbol.for("babbstack.endpoint-registry");

type RegistryGlobal = typeof globalThis & {
  [ENDPOINT_REGISTRY_KEY]?: EndpointRuntimeDefinition[];
};

const registryGlobal = globalThis as RegistryGlobal;

if (!registryGlobal[ENDPOINT_REGISTRY_KEY]) {
  registryGlobal[ENDPOINT_REGISTRY_KEY] = [];
}

export const endpointRegistry = registryGlobal[
  ENDPOINT_REGISTRY_KEY
] as EndpointRuntimeDefinition[];
