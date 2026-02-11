import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, sep } from "node:path";
import { promisify } from "node:util";
import type { LambdaLayerMetadata } from "./to-lambda-layer-metadata";

const execFileAsync = promisify(execFile);

type PackageQueueItem = {
  moduleName: string;
  resolveFromDirectory: string;
};

function toDependenciesFromPackageJson(source: string): string[] {
  const parsed = JSON.parse(source) as {
    dependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
  };
  return [
    ...Object.keys(parsed.dependencies ?? {}),
    ...Object.keys(parsed.optionalDependencies ?? {}),
  ];
}

function toPackageRootPath(moduleName: string, resolveFromDirectory: string): string {
  const resolver = createRequire(join(resolveFromDirectory, "__simple_api_resolver__.cjs"));
  try {
    const packageJsonPath = resolver.resolve(`${moduleName}/package.json`);
    return dirname(packageJsonPath);
  } catch {
    throw new Error(
      `Cannot resolve external module "${moduleName}" from "${resolveFromDirectory}". Install it in that app (for example: bun add ${moduleName}).`,
    );
  }
}

async function toPackageRoots(
  moduleNames: ReadonlyArray<string>,
  resolveFromDirectory: string,
): Promise<Map<string, string>> {
  const packageRoots = new Map<string, string>();
  const queue: PackageQueueItem[] = moduleNames.map((moduleName) => ({
    moduleName,
    resolveFromDirectory,
  }));

  while (queue.length > 0) {
    const next = queue.shift();
    if (!next || packageRoots.has(next.moduleName)) {
      continue;
    }

    const packageRoot = toPackageRootPath(next.moduleName, next.resolveFromDirectory);
    packageRoots.set(next.moduleName, packageRoot);
    const packageJsonSource = await readFile(join(packageRoot, "package.json"), "utf8");
    const dependencies = toDependenciesFromPackageJson(packageJsonSource);
    for (const dependencyName of dependencies) {
      if (!packageRoots.has(dependencyName)) {
        queue.push({
          moduleName: dependencyName,
          resolveFromDirectory: packageRoot,
        });
      }
    }
  }

  return packageRoots;
}

async function writeLayerArchive(
  artifactFilePath: string,
  moduleNames: ReadonlyArray<string>,
  resolveFromDirectory: string,
): Promise<void> {
  const packageRoots = await toPackageRoots(moduleNames, resolveFromDirectory);

  const tempDirectory = await mkdtemp(join(tmpdir(), "babbstack-layer-"));
  const layerNodeModulesDirectory = join(tempDirectory, "nodejs", "node_modules");
  await mkdir(layerNodeModulesDirectory, { recursive: true });

  try {
    for (const [moduleName, packageRoot] of packageRoots.entries()) {
      const destinationPath = join(layerNodeModulesDirectory, moduleName);
      await mkdir(dirname(destinationPath), { recursive: true });
      await cp(packageRoot, destinationPath, {
        filter(sourcePath) {
          return !sourcePath.includes(`${sep}node_modules${sep}`);
        },
        recursive: true,
      });
    }

    await execFileAsync("zip", ["-r", artifactFilePath, "nodejs"], {
      cwd: tempDirectory,
    });
  } finally {
    await rm(tempDirectory, { force: true, recursive: true });
  }
}

export async function writeLambdaLayerArtifacts(
  outputDirectory: string,
  layerMetadata: LambdaLayerMetadata,
  resolveFromDirectory: string,
): Promise<string[]> {
  const layerEntries = Object.entries(layerMetadata.layersByKey).sort(([left], [right]) =>
    left.localeCompare(right),
  );
  if (layerEntries.length === 0) {
    return [];
  }

  await mkdir(outputDirectory, { recursive: true });
  const artifactFileNames: string[] = [];

  for (const [, layer] of layerEntries) {
    const artifactFileName = layer.artifact_file;
    await writeLayerArchive(
      join(outputDirectory, artifactFileName),
      layer.module_names,
      resolveFromDirectory,
    );
    artifactFileNames.push(artifactFileName);
  }

  return artifactFileNames;
}
