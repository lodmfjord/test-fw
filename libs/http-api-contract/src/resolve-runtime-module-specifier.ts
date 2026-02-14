import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

export function resolveRuntimeModuleSpecifier(
  endpointModulePath: string,
  moduleName: string,
  fallbackPath: string,
): string {
  try {
    const requireFromEndpoint = createRequire(endpointModulePath);
    return requireFromEndpoint.resolve(moduleName);
  } catch {}

  try {
    const requireFromFramework = createRequire(import.meta.url);
    return requireFromFramework.resolve(moduleName);
  } catch {
    return fileURLToPath(new URL(fallbackPath, import.meta.url));
  }
}
