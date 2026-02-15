/**
 * @fileoverview Implements to lambda functions.
 */
import type { Contract } from "./types";

/**
 * Converts to lambda functions.
 * @param contract - Contract parameter.
 * @example
 * toLambdaFunctions(contract)
 * @returns Output value.
 */
export function toLambdaFunctions(contract: Contract): Record<string, Record<string, unknown>> {
  const lambdas = [...contract.lambdasManifest.functions].sort((left, right) =>
    left.routeId.localeCompare(right.routeId),
  );
  const result: Record<string, Record<string, unknown>> = {};

  for (const item of lambdas) {
    result[item.routeId] = {
      architecture: item.architecture,
      artifact_path: item.artifactPath,
      ...(item.ephemeralStorageMb === undefined
        ? {}
        : { ephemeral_storage_mb: item.ephemeralStorageMb }),
      ...(item.memoryMb === undefined ? {} : { memory_mb: item.memoryMb }),
      method: item.method,
      path: item.path,
      ...(item.reservedConcurrency === undefined
        ? {}
        : { reserved_concurrency: item.reservedConcurrency }),
      runtime: item.runtime,
      ...(item.timeoutSeconds === undefined ? {} : { timeout_seconds: item.timeoutSeconds }),
    };
  }

  return result;
}
