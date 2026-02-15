/** @fileoverview Implements collect lambda external modules by route. @module libs/http-api-contract/src/collect-lambda-external-modules-by-route */
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { toRequiredRuntimeExternalModules } from "./to-required-runtime-external-modules";

/** Converts values to external modules. */
function toExternalModules(externalModules: string[] | undefined): string[] {
  return toRequiredRuntimeExternalModules(externalModules);
}

/** Converts values to route id. */
function toRouteId(fileName: string): string {
  return fileName.endsWith(".mjs") ? fileName.slice(0, -".mjs".length) : fileName;
}

/** Checks whether has module import. */
function hasModuleImport(source: string, moduleName: string): boolean {
  return source.includes(`"${moduleName}"`) || source.includes(`'${moduleName}'`);
}

/** Converts values to module specifiers. */
function toModuleSpecifiers(
  externalModules: ReadonlyArray<string>,
  resolveFromPath: string,
): Record<string, string[]> {
  const resolver = createRequire(resolveFromPath);
  const specifiersByModule: Record<string, string[]> = {};

  for (const moduleName of externalModules) {
    const candidates = new Set<string>([moduleName]);
    try {
      candidates.add(resolver.resolve(moduleName));
    } catch {}

    specifiersByModule[moduleName] = [...candidates];
  }

  return specifiersByModule;
}

/** Handles collect lambda external modules by route. @example `await collectLambdaExternalModulesByRoute(input)` */
export async function collectLambdaExternalModulesByRoute(
  lambdaOutputDirectory: string,
  lambdaFileNames: ReadonlyArray<string>,
  externalModules: string[] | undefined,
  resolveFromPath: string,
): Promise<Record<string, string[]>> {
  const modules = toExternalModules(externalModules);
  if (modules.length === 0) {
    return {};
  }
  const moduleSpecifiersByModule = toModuleSpecifiers(modules, resolveFromPath);

  const byRoute: Record<string, string[]> = {};

  for (const fileName of lambdaFileNames) {
    const source = await readFile(join(lambdaOutputDirectory, fileName), "utf8");
    const used = modules.filter((moduleName) =>
      (moduleSpecifiersByModule[moduleName] ?? []).some((specifier) =>
        hasModuleImport(source, specifier),
      ),
    );
    if (used.length > 0) {
      byRoute[toRouteId(fileName)] = used;
    }
  }

  return byRoute;
}
