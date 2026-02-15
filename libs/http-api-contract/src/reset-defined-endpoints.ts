/**
 * @fileoverview Implements reset defined endpoints.
 */
import { endpointRegistry } from "./endpoint-registry-store";

/**
 * Runs reset defined endpoints.
 * @example
 * resetDefinedEndpoints()
 */
export function resetDefinedEndpoints(): void {
  endpointRegistry.length = 0;
}
