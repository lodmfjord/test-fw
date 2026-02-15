/** @fileoverview Implements to lambda layer metadata. @module libs/http-api-contract/src/to-lambda-layer-metadata */
import { createHash } from "node:crypto";

type LambdaLayerDefinition = {
  artifact_file: string;
  module_names: string[];
};

export type LambdaLayerMetadata = {
  layersByKey: Record<string, LambdaLayerDefinition>;
  routeLayerKeyByRoute: Record<string, string>;
};

/** Converts values to layer key. */
function toLayerKey(moduleNames: ReadonlyArray<string>): string {
  const signature = moduleNames.join("|");
  const hash = createHash("sha256").update(signature).digest("hex").slice(0, 12);
  return `layer_${hash}`;
}

/** Converts values to lambda layer metadata. @example `toLambdaLayerMetadata(input)` */
export function toLambdaLayerMetadata(
  lambdaExternalModulesByRoute: Record<string, string[]>,
): LambdaLayerMetadata {
  const layersByKey: Record<string, LambdaLayerDefinition> = {};
  const routeLayerKeyByRoute: Record<string, string> = {};
  const layerKeyBySignature = new Map<string, string>();

  for (const [routeId, moduleNames] of Object.entries(lambdaExternalModulesByRoute)) {
    const normalizedModuleNames = [...new Set(moduleNames)].sort((left, right) =>
      left.localeCompare(right),
    );
    if (normalizedModuleNames.length === 0) {
      continue;
    }

    const signature = normalizedModuleNames.join("|");
    let layerKey = layerKeyBySignature.get(signature);
    if (!layerKey) {
      layerKey = toLayerKey(normalizedModuleNames);
      layerKeyBySignature.set(signature, layerKey);
      layersByKey[layerKey] = {
        artifact_file: `${layerKey}.zip`,
        module_names: normalizedModuleNames,
      };
    }

    routeLayerKeyByRoute[routeId] = layerKey;
  }

  return {
    layersByKey,
    routeLayerKeyByRoute,
  };
}
