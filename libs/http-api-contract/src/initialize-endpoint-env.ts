/** @fileoverview Implements initialize endpoint env. @module libs/http-api-contract/src/initialize-endpoint-env */
import { toSecretDefinition } from "./to-secret-definition";
import type { EndpointRuntimeDefinition } from "./types";

/** Handles initialize endpoint env. @example `initializeEndpointEnv(input)` */
export function initializeEndpointEnv(endpoints: ReadonlyArray<EndpointRuntimeDefinition>): void {
  if (typeof process === "undefined" || !process.env) {
    return;
  }

  for (const endpoint of endpoints) {
    for (const [name, value] of Object.entries(endpoint.env ?? {})) {
      const secret = toSecretDefinition(value);
      if (secret) {
        const localEnvName = secret.localEnvName ?? name;
        const localValue = process.env[localEnvName];
        if (typeof localValue === "string") {
          process.env[name] = localValue;
          continue;
        }

        console.log(`[simple-api] Would load parameter ${secret.parameterName} into ${name}`);
        continue;
      }

      process.env[name] = value;
    }
  }
}
