/** @fileoverview Implements write sqs listener js files. @module libs/http-api-contract/src/write-sqs-listener-js-files */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import type { SqsListenerRuntimeDefinition } from "@babbstack/sqs";
import { renderSqsListenerLambdaSource } from "./render-sqs-listener-lambda-source";
import type { LambdaJsGenerationOptions } from "./types";

/** Handles resolve endpoint module path. */
function resolveEndpointModulePath(endpointModulePath: string): string {
  const source = endpointModulePath.trim();
  if (source.length === 0) {
    throw new Error("endpointModulePath is required");
  }

  return isAbsolute(source) ? source : resolve(process.cwd(), source);
}

/** Handles resolve runtime sqs import specifier. */
function resolveRuntimeSqsImportSpecifier(endpointModulePath: string): string {
  const moduleSpecifier = "@babbstack/sqs";

  try {
    const requireFromEndpoint = createRequire(endpointModulePath);
    return requireFromEndpoint.resolve(moduleSpecifier);
  } catch {}

  try {
    const requireFromFramework = createRequire(import.meta.url);
    return requireFromFramework.resolve(moduleSpecifier);
  } catch {
    return fileURLToPath(new URL("../../sqs/src/index.ts", import.meta.url));
  }
}

/** Handles bundle entry. */
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

/** Handles resolve external modules. */
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

/** Handles strip bundler module markers. */
function stripBundlerModuleMarkers(source: string): string {
  return source.replace(/^\/\/\s+(?:\.\.\/|\/).+\.(?:[cm]?[jt]s|tsx?)$/gm, "").trimStart();
}

/** Handles write sqs listener js files. @example `await writeSqsListenerJsFiles(input)` */
export async function writeSqsListenerJsFiles(
  outputDirectory: string,
  listeners: ReadonlyArray<SqsListenerRuntimeDefinition>,
  options: LambdaJsGenerationOptions,
): Promise<string[]> {
  const directory = outputDirectory.trim();
  if (directory.length === 0) {
    throw new Error("outputDirectory is required");
  }

  const endpointModulePath = resolveEndpointModulePath(options.endpointModulePath);
  const runtimeSqsImportSpecifier = resolveRuntimeSqsImportSpecifier(endpointModulePath);
  const externalModules = resolveExternalModules(options.externalModules, endpointModulePath);
  const lambdaListeners = listeners.filter((listener) => listener.target?.kind !== "step-function");
  await mkdir(directory, { recursive: true });

  const fileNames = lambdaListeners
    .map((listener) => `${listener.listenerId}.mjs`)
    .sort((left, right) => left.localeCompare(right));
  const tempDirectory = await mkdtemp(join(process.cwd(), ".babbstack-sqs-listener-entry-"));

  try {
    for (const listener of lambdaListeners) {
      const fileName = `${listener.listenerId}.mjs`;
      const source = renderSqsListenerLambdaSource(
        listener,
        endpointModulePath,
        runtimeSqsImportSpecifier,
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
