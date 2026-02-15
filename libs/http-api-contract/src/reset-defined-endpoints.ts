/** @fileoverview Implements reset defined endpoints. @module libs/http-api-contract/src/reset-defined-endpoints */
import { endpointRegistry } from "./endpoint-registry-store";

/** Handles reset defined endpoints. @example `resetDefinedEndpoints(input)` */
export function resetDefinedEndpoints(): void {
  endpointRegistry.length = 0;
}
