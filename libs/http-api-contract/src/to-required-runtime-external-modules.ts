/** @fileoverview Implements to required runtime external modules. @module libs/http-api-contract/src/to-required-runtime-external-modules */
const REQUIRED_RUNTIME_EXTERNAL_MODULES = ["zod"] as const;

/** Converts values to normalized module names. */
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

/** Converts values to required runtime external modules. @example `toRequiredRuntimeExternalModules(input)` */
export function toRequiredRuntimeExternalModules(
  externalModules: ReadonlyArray<string> | undefined,
): string[] {
  return [...toNormalizedModuleNames(externalModules)];
}
