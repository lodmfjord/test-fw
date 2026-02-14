import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import type { SqsListenerRuntimeDefinition } from "@babbstack/sqs";
import type { LambdaJsGenerationOptions } from "./types";

function resolveEndpointModulePath(endpointModulePath: string): string {
  const source = endpointModulePath.trim();
  if (source.length === 0) {
    throw new Error("endpointModulePath is required");
  }

  return isAbsolute(source) ? source : resolve(process.cwd(), source);
}

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

function stripBundlerModuleMarkers(source: string): string {
  return source.replace(/^\/\/\s+(?:\.\.\/|\/).+\.(?:[cm]?[jt]s|tsx?)$/gm, "").trimStart();
}

function renderListenerLambdaSource(
  listener: SqsListenerRuntimeDefinition,
  endpointModulePath: string,
  runtimeSqsImportSpecifier: string,
): string {
  return `import { listDefinedSqsListeners } from ${JSON.stringify(runtimeSqsImportSpecifier)};

let listenerPromise;

async function loadListener() {
  if (!listenerPromise) {
    listenerPromise = (async () => {
      const existingListener = listDefinedSqsListeners().find((item) => {
        return item.listenerId === "${listener.listenerId}";
      });
      if (existingListener) {
        return existingListener;
      }

      await import("${endpointModulePath}");

      const loadedListener = listDefinedSqsListeners().find((item) => {
        return item.listenerId === "${listener.listenerId}";
      });
      if (!loadedListener) {
        throw new Error("SQS listener not found for ${listener.listenerId}");
      }

      return loadedListener;
    })();
  }

  return listenerPromise;
}

function toRecords(event) {
  return Array.isArray(event?.Records) ? event.Records : [];
}

function parseRecordBody(record) {
  const rawBody = typeof record?.body === "string" ? record.body : "";
  if (rawBody.trim().length === 0) {
    return undefined;
  }

  return JSON.parse(rawBody);
}

export async function handler(event) {
  const listener = await loadListener();
  const records = toRecords(event);

  for (const record of records) {
    const parsedBody = parseRecordBody(record);
    const message = listener.parse(parsedBody);
    await listener.handler({
      message,
      request: {
        rawEvent: event,
        rawRecord: record
      }
    });
  }

  return {
    batchItemFailures: []
  };
}
`;
}

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
  await mkdir(directory, { recursive: true });

  const fileNames = listeners
    .map((listener) => `${listener.listenerId}.mjs`)
    .sort((left, right) => left.localeCompare(right));
  const tempDirectory = await mkdtemp(join(process.cwd(), ".babbstack-sqs-listener-entry-"));

  try {
    for (const listener of listeners) {
      const fileName = `${listener.listenerId}.mjs`;
      const source = renderListenerLambdaSource(
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
