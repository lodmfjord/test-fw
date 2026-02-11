import { endpointRegistry } from "./endpoint-registry-store";

export function resetDefinedEndpoints(): void {
  endpointRegistry.length = 0;
}
