/** @fileoverview Implements create env. @module libs/http-api-contract/src/create-env */
/** @example `createEnv(input)` */ export function createEnv(
  input: Record<string, string>,
): Record<string, string> {
  return { ...input };
}
