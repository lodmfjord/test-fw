/** @fileoverview Implements to lambda functions. @module libs/http-api-contract/src/to-lambda-functions */
import type { Contract } from "./types";

/** Converts values to lambda functions. @example `toLambdaFunctions(input)` */
export function toLambdaFunctions(contract: Contract): Record<string, Record<string, unknown>> {
  const lambdas = [...contract.lambdasManifest.functions].sort((left, right) =>
    left.routeId.localeCompare(right.routeId),
  );
  const result: Record<string, Record<string, unknown>> = {};

  for (const item of lambdas) {
    result[item.routeId] = {
      architecture: item.architecture,
      artifact_path: item.artifactPath,
      memory_mb: item.memoryMb,
      method: item.method,
      path: item.path,
      runtime: item.runtime,
      timeout_seconds: item.timeoutSeconds,
    };
  }

  return result;
}
