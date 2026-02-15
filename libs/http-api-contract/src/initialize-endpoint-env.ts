/**
 * @fileoverview Implements initialize endpoint env.
 */
import { createNoopLogger } from "@babbstack/logger";
import type { Logger } from "@babbstack/logger";
import { toSecretDefinition } from "./to-secret-definition";
import type { EndpointRuntimeDefinition } from "./types";

/**
 * Runs initialize endpoint env.
 * @param endpoints - Endpoints parameter.
 * @param logger - Logger parameter.
 * @example
 * initializeEndpointEnv(endpoints, logger)
 */
export function initializeEndpointEnv(
  endpoints: ReadonlyArray<EndpointRuntimeDefinition>,
  logger: Logger = createNoopLogger(),
): void {
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

        logger.info("[simple-api] Would load parameter for env", {
          envName: name,
          parameterName: secret.parameterName,
        });
        continue;
      }

      process.env[name] = value;
    }
  }
}
