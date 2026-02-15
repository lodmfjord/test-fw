/**
 * @fileoverview Implements to required runtime external modules.
 */
const REQUIRED_RUNTIME_EXTERNAL_MODULES = ["@aws-lambda-powertools/logger", "zod"] as const;

/** Converts to normalized module names. */
function toNormalizedModuleNames(
  externalModules: ReadonlyArray<string> | undefined,
): ReadonlyArray<string> {
  if (!externalModules) {
    return REQUIRED_RUNTIME_EXTERNAL_MODULES;
  }

  const moduleNames = new Set<string>(REQUIRED_RUNTIME_EXTERNAL_MODULES);
  for (const moduleName of externalModules) {
    const normalized = moduleName.trim();
    if (normalized.length > 0) {
      moduleNames.add(normalized);
    }
  }

  return [...moduleNames].sort((left, right) => left.localeCompare(right));
}

/**
 * Converts to required runtime external modules.
 * @param externalModules - External modules parameter.
 * @example
 * toRequiredRuntimeExternalModules(externalModules)
 * @returns Output value.
 */
export function toRequiredRuntimeExternalModules(
  externalModules: ReadonlyArray<string> | undefined,
): string[] {
  return [...toNormalizedModuleNames(externalModules)];
}
