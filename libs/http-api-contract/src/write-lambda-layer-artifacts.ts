/** @fileoverview Implements write lambda layer artifacts. @module libs/http-api-contract/src/write-lambda-layer-artifacts */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { lambdaLayerArtifactsHelpers } from "./lambda-layer-artifacts-helpers";
import type { LambdaLayerMetadata } from "./to-lambda-layer-metadata";

/** Handles write lambda layer artifacts. @example `await writeLambdaLayerArtifacts(input)` */
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
  const sourceCodeHashByLayerKey: Record<string, string> = {};

  for (const [layerKey, layer] of layerEntries) {
    const artifactFileName = layer.artifact_file;
    sourceCodeHashByLayerKey[layerKey] = await lambdaLayerArtifactsHelpers.writeLayerArchive(
      join(outputDirectory, artifactFileName),
      layer.module_names,
      resolveFromDirectory,
    );
    artifactFileNames.push(artifactFileName);
  }
  await writeFile(
    join(outputDirectory, "source-code-hashes.json"),
    `${JSON.stringify(sourceCodeHashByLayerKey, null, 2)}\n`,
    "utf8",
  );

  return artifactFileNames;
}
