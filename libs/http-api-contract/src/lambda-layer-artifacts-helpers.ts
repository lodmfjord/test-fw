/** @fileoverview Implements lambda layer artifacts helpers. @module libs/http-api-contract/src/lambda-layer-artifacts-helpers */
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type PackageQueueItem = {
  moduleName: string;
  resolveFromDirectory: string;
};

type HashInputFile = {
  hashPath: string;
  sourcePath: string;
};

/** Handles should copy package path. */
function shouldCopyPackagePath(sourcePath: string, packageRoot: string): boolean {
  if (sourcePath === packageRoot) {
    return true;
  }

  const relativePath = sourcePath
    .slice(packageRoot.length)
    .replaceAll("\\", "/")
    .replace(/^\/+/, "");
  return !/(^|\/)node_modules(\/|$)/.test(relativePath);
}

/** Converts values to dependencies from package json. */
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

/** Converts values to package root path. */
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

/** Converts values to package roots. */
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

/** Converts values to hash input files for package. */
async function toHashInputFilesForPackage(
  packageRoot: string,
  packageOutputRoot: string,
): Promise<HashInputFile[]> {
  const queue = [packageRoot];
  const files: HashInputFile[] = [];

  while (queue.length > 0) {
    const currentDirectory = queue.shift();
    if (!currentDirectory) {
      continue;
    }

    const entries = (await readdir(currentDirectory, { withFileTypes: true })).sort((left, right) =>
      left.name.localeCompare(right.name),
    );
    for (const entry of entries) {
      const entryPath = join(currentDirectory, entry.name);
      if (!shouldCopyPackagePath(entryPath, packageRoot)) {
        continue;
      }

      if (entry.isDirectory()) {
        queue.push(entryPath);
        continue;
      }

      if (entry.isFile()) {
        files.push({
          hashPath: `${join(packageOutputRoot, relative(packageRoot, entryPath)).replaceAll("\\", "/")}`,
          sourcePath: entryPath,
        });
      }
    }
  }

  return files.sort((left, right) => left.hashPath.localeCompare(right.hashPath));
}

/** Converts values to layer source code hash. */
async function toLayerSourceCodeHash(packageRoots: Map<string, string>): Promise<string> {
  const hash = createHash("sha256");
  const layerFiles: HashInputFile[] = [];
  const sortedPackageEntries = [...packageRoots.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  );

  for (const [moduleName, packageRoot] of sortedPackageEntries) {
    const packageFiles = await toHashInputFilesForPackage(
      packageRoot,
      join("nodejs", "node_modules", moduleName),
    );
    layerFiles.push(...packageFiles);
  }

  for (const file of layerFiles) {
    hash.update(file.hashPath);
    hash.update("\n");
    hash.update(await readFile(file.sourcePath));
    hash.update("\n");
  }

  return hash.digest("base64");
}

/** Handles write layer archive. */
async function writeLayerArchive(
  artifactFilePath: string,
  moduleNames: ReadonlyArray<string>,
  resolveFromDirectory: string,
): Promise<string> {
  const packageRoots = await toPackageRoots(moduleNames, resolveFromDirectory);
  const sourceCodeHash = await toLayerSourceCodeHash(packageRoots);

  const tempDirectory = await mkdtemp(join(tmpdir(), "babbstack-layer-"));
  const layerNodeModulesDirectory = join(tempDirectory, "nodejs", "node_modules");
  await mkdir(layerNodeModulesDirectory, { recursive: true });

  try {
    for (const [moduleName, packageRoot] of packageRoots.entries()) {
      const destinationPath = join(layerNodeModulesDirectory, moduleName);
      await mkdir(dirname(destinationPath), { recursive: true });
      await cp(packageRoot, destinationPath, {
        filter(sourcePath) {
          return shouldCopyPackagePath(sourcePath, packageRoot);
        },
        recursive: true,
      });
    }

    await execFileAsync("zip", ["-r", artifactFilePath, "nodejs"], {
      cwd: tempDirectory,
    });
    return sourceCodeHash;
  } finally {
    await rm(tempDirectory, { force: true, recursive: true });
  }
}

export const lambdaLayerArtifactsHelpers = {
  writeLayerArchive,
};
