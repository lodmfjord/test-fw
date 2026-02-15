/**
 * @fileoverview Implements write lambda js files.
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { isAbsolute, join, resolve } from "node:path";
import { build } from "esbuild";
import { assertUniqueRouteIds } from "./assert-unique-route-ids";
import { renderLambdaRuntimeEntrySource } from "./render-lambda-runtime-entry";
import { toRequiredRuntimeExternalModules } from "./to-required-runtime-external-modules";
import type { EndpointRuntimeDefinition, LambdaJsGenerationOptions } from "./types";

/** Runs resolve endpoint module path. */
function resolveEndpointModulePath(endpointModulePath: string): string {
  const source = endpointModulePath.trim();
  if (source.length === 0) {
    throw new Error("endpointModulePath is required");
  }

  return isAbsolute(source) ? source : resolve(process.cwd(), source);
}

/** Runs bundle entry. */
async function bundleEntry(
  entryPath: string,
  absWorkingDirectory: string,
  externalModules: string[],
): Promise<string> {
  const result = await build({
    absWorkingDir: absWorkingDirectory,
    bundle: true,
    external: externalModules,
    entryPoints: [entryPath],
    format: "esm",
    logLevel: "silent",
    minify: false,
    platform: "node",
    sourcemap: false,
    target: "node20",
    write: false,
  });

  const bundled = result.outputFiles[0];
  if (!bundled) {
    throw new Error(`No bundled output produced for ${entryPath}`);
  }

  return bundled.text;
}

/** Runs resolve external modules. */
function resolveExternalModules(
  externalModules: string[] | undefined,
  endpointModulePath: string,
): string[] {
  if (!externalModules) {
    return [];
  }

  const resolver = createRequire(endpointModulePath);
  const expanded = new Set<string>();

  for (const moduleName of externalModules
    .map((moduleName) => moduleName.trim())
    .filter((moduleName) => moduleName.length > 0)) {
    expanded.add(moduleName);
    expanded.add(`${moduleName}/*`);

    try {
      expanded.add(resolver.resolve(moduleName));
    } catch {}
  }

  return [...expanded].sort((left, right) => left.localeCompare(right));
}

/** Runs strip bundler module markers. */
function stripBundlerModuleMarkers(source: string): string {
  return source.replace(/^\/\/\s+(?:\.\.\/|\/).+\.(?:[cm]?[jt]s|tsx?)$/gm, "").trimStart();
}

/**
 * Runs write lambda js files.
 * @param outputDirectory - Output directory parameter.
 * @param endpoints - Endpoints parameter.
 * @param options - Options parameter.
 * @example
 * await writeLambdaJsFiles(outputDirectory, endpoints, options)
 * @returns Output value.
 * @throws Error when operation fails.
 */
export async function writeLambdaJsFiles(
  outputDirectory: string,
  endpoints: ReadonlyArray<EndpointRuntimeDefinition>,
  options: LambdaJsGenerationOptions,
): Promise<string[]> {
  const directory = outputDirectory.trim();
  if (directory.length === 0) {
    throw new Error("outputDirectory is required");
  }

  assertUniqueRouteIds(endpoints);

  const endpointModulePath = resolveEndpointModulePath(options.endpointModulePath);
  const externalModules = resolveExternalModules(
    toRequiredRuntimeExternalModules(options.externalModules),
    endpointModulePath,
  );
  const endpointModuleSource = await readFile(endpointModulePath, "utf8");
  await mkdir(directory, { recursive: true });

  const fileNames = endpoints
    .map((endpoint) => `${endpoint.routeId}.mjs`)
    .sort((left, right) => left.localeCompare(right));
  const tempDirectory = await mkdtemp(join(process.cwd(), ".babbstack-lambda-entry-"));

  try {
    for (const endpoint of endpoints) {
      const fileName = `${endpoint.routeId}.mjs`;
      const source = renderLambdaRuntimeEntrySource(
        endpointModulePath,
        endpointModuleSource,
        endpoint,
      );
      const entryPath = join(tempDirectory, `${fileName}.entry.ts`);
      const outputPath = join(directory, fileName);
      await writeFile(entryPath, source, "utf8");
      const bundledSource = await bundleEntry(entryPath, tempDirectory, externalModules);
      await writeFile(outputPath, stripBundlerModuleMarkers(bundledSource), "utf8");
    }
  } finally {
    await rm(tempDirectory, { force: true, recursive: true });
  }

  return fileNames;
}
