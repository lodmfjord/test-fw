/**
 * @fileoverview Implements create env.
 */
/**
 * Creates env.
 * @param input - Input parameter.
 * @example
 * createEnv(input)
 */ export function createEnv(input: Record<string, string>): Record<string, string> {
  return { ...input };
}
