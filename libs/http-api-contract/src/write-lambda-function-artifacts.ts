/**
 * @fileoverview Implements write lambda function artifacts.
 */
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { promisify } from "node:util";
import type { LambdasManifest } from "./types";

const execFileAsync = promisify(execFile);

/** Runs write lambda artifact. */
async function writeLambdaArtifact(
  artifactFilePath: string,
  lambdaSourceFilePath: string,
): Promise<void> {
  const tempDirectory = await mkdtemp(join(tmpdir(), "babbstack-lambda-artifact-"));
  const entryPath = join(tempDirectory, "index.mjs");

  try {
    await cp(lambdaSourceFilePath, entryPath);
    await execFileAsync("zip", ["-r", artifactFilePath, "index.mjs"], {
      cwd: tempDirectory,
    });
  } finally {
    await rm(tempDirectory, { force: true, recursive: true });
  }
}

/** Converts to lambda source code hash. */
async function toLambdaSourceCodeHash(lambdaSourceFilePath: string): Promise<string> {
  const source = await readFile(lambdaSourceFilePath);
  return createHash("sha256").update(source).digest("base64");
}

/**
 * Runs write lambda function artifacts.
 * @param outputDirectory - Output directory parameter.
 * @param lambdasManifest - Lambdas manifest parameter.
 * @param lambdaOutputDirectory - Lambda output directory parameter.
 * @param additionalFunctionIds - Additional function ids parameter.
 * @example
 * await writeLambdaFunctionArtifacts(outputDirectory, lambdasManifest, lambdaOutputDirectory, additionalFunctionIds)
 * @returns Output value.
 */
export async function writeLambdaFunctionArtifacts(
  outputDirectory: string,
  lambdasManifest: LambdasManifest,
  lambdaOutputDirectory: string,
  additionalFunctionIds: ReadonlyArray<string> = [],
): Promise<string[]> {
  const lambdaFunctions = [...lambdasManifest.functions].sort((left, right) =>
    left.routeId.localeCompare(right.routeId),
  );
  const existingRouteIds = new Set(lambdaFunctions.map((item) => item.routeId));
  const additionalRouteIds = [...new Set(additionalFunctionIds)]
    .filter((routeId) => !existingRouteIds.has(routeId))
    .sort((left, right) => left.localeCompare(right));
  const functionDescriptors = [
    ...lambdaFunctions.map((item) => ({
      artifactFileName: basename(item.artifactPath),
      routeId: item.routeId,
    })),
    ...additionalRouteIds.map((routeId) => ({
      artifactFileName: `${routeId}.zip`,
      routeId,
    })),
  ];
  if (functionDescriptors.length === 0) {
    return [];
  }

  await mkdir(outputDirectory, { recursive: true });
  const artifactFileNames: string[] = [];
  const sourceCodeHashByRoute: Record<string, string> = {};

  for (const functionDescriptor of functionDescriptors) {
    const artifactFileName = functionDescriptor.artifactFileName;
    const sourceFilePath = join(lambdaOutputDirectory, `${functionDescriptor.routeId}.mjs`);
    await writeLambdaArtifact(join(outputDirectory, artifactFileName), sourceFilePath);
    sourceCodeHashByRoute[functionDescriptor.routeId] =
      await toLambdaSourceCodeHash(sourceFilePath);
    artifactFileNames.push(artifactFileName);
  }
  await writeFile(
    join(outputDirectory, "source-code-hashes.json"),
    `${JSON.stringify(sourceCodeHashByRoute, null, 2)}\n`,
    "utf8",
  );

  return artifactFileNames;
}
