import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { build } from "esbuild";
import { renderLambdaRuntimeEntrySource } from "./render-lambda-runtime-entry";
import type { EndpointRuntimeDefinition, LambdaJsGenerationOptions } from "./types";

function resolveEndpointModulePath(endpointModulePath: string): string {
  const source = endpointModulePath.trim();
  if (source.length === 0) {
    throw new Error("endpointModulePath is required");
  }

  return isAbsolute(source) ? source : resolve(process.cwd(), source);
}

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

function resolveExternalModules(externalModules: string[] | undefined): string[] {
  if (!externalModules) {
    return [];
  }

  return externalModules
    .map((moduleName) => moduleName.trim())
    .filter((moduleName) => moduleName.length > 0);
}

function stripBundlerModuleMarkers(source: string): string {
  return source.replace(/^\/\/\s+(?:\.\.\/|\/).+\.(?:[cm]?[jt]s|tsx?)$/gm, "").trimStart();
}

export async function writeLambdaJsFiles(
  outputDirectory: string,
  endpoints: ReadonlyArray<EndpointRuntimeDefinition>,
  options: LambdaJsGenerationOptions,
): Promise<string[]> {
  const directory = outputDirectory.trim();
  if (directory.length === 0) {
    throw new Error("outputDirectory is required");
  }

  const endpointModulePath = resolveEndpointModulePath(options.endpointModulePath);
  const externalModules = resolveExternalModules(options.externalModules);
  const endpointModuleSource = await readFile(endpointModulePath, "utf8");
  await mkdir(directory, { recursive: true });

  const fileNames = endpoints
    .map((endpoint) => `${endpoint.routeId}.mjs`)
    .sort((left, right) => left.localeCompare(right));
  const tempDirectory = await mkdtemp(join(process.cwd(), ".simple-api-lambda-entry-"));

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
