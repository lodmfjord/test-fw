import { toLambdaLayerMetadata } from "./to-lambda-layer-metadata";
import type { Contract } from "./types";

type TerraformJson = Record<string, unknown>;

function toTerraformReference(expression: string): string {
  return `\${${expression}}`;
}

function toLambdaFunctions(contract: Contract): Record<string, Record<string, unknown>> {
  const lambdas = [...contract.lambdasManifest.functions].sort((left, right) =>
    left.routeId.localeCompare(right.routeId),
  );
  const result: Record<string, Record<string, unknown>> = {};

  for (const item of lambdas) {
    result[item.routeId] = {
      architecture: item.architecture,
      artifact_path: item.artifactPath,
      memory_mb: item.memoryMb,
      method: item.method,
      path: item.path,
      runtime: item.runtime,
      timeout_seconds: item.timeoutSeconds,
    };
  }

  return result;
}

export function createLambdasTerraformJson(
  contract: Contract,
  lambdaExternalModulesByRoute: Record<string, string[]> | undefined,
): TerraformJson {
  const layerMetadata = toLambdaLayerMetadata(lambdaExternalModulesByRoute ?? {});
  const hasLayers = Object.keys(layerMetadata.layersByKey).length > 0;

  const routeConfig: Record<string, unknown> = {
    architectures: [toTerraformReference("each.value.architecture")],
    filename: `${toTerraformReference("var.lambda_artifacts_base_path")}/${toTerraformReference("basename(each.value.artifact_path)")}`,
    for_each: toTerraformReference("local.lambda_functions"),
    function_name: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.lambda_function_name_prefix")}${toTerraformReference("each.key")}`,
    handler: toTerraformReference("var.lambda_handler"),
    memory_size: toTerraformReference("each.value.memory_mb"),
    role: toTerraformReference("var.lambda_execution_role_arn"),
    runtime: toTerraformReference("each.value.runtime"),
    timeout: toTerraformReference("each.value.timeout_seconds"),
    ...(hasLayers
      ? {
          layers: toTerraformReference(
            '[for layer_key in compact([lookup(local.lambda_layer_key_by_route, each.key, "")]) : aws_lambda_layer_version.external[layer_key].arn]',
          ),
        }
      : {}),
  };

  return {
    locals: {
      lambda_functions: toLambdaFunctions(contract),
      ...(hasLayers
        ? {
            external_layers: layerMetadata.layersByKey,
            lambda_layer_key_by_route: layerMetadata.routeLayerKeyByRoute,
          }
        : {}),
    },
    resource: {
      aws_lambda_function: {
        route: routeConfig,
      },
      ...(hasLayers
        ? {
            aws_lambda_layer_version: {
              external: {
                compatible_runtimes: ["nodejs20.x"],
                filename: `${toTerraformReference("var.lambda_layer_artifacts_base_path")}/${toTerraformReference("each.value.artifact_file")}`,
                for_each: toTerraformReference("local.external_layers"),
                layer_name: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.lambda_layer_name_prefix")}${toTerraformReference("each.key")}`,
              },
            },
          }
        : {}),
    },
    variable: {
      lambda_artifacts_base_path: { default: "lambda-artifacts", type: "string" },
      lambda_execution_role_arn: { type: "string" },
      lambda_function_name_prefix: { default: "", type: "string" },
      lambda_handler: { default: "index.handler", type: "string" },
      ...(hasLayers
        ? {
            lambda_layer_artifacts_base_path: { default: "layer-artifacts", type: "string" },
            lambda_layer_name_prefix: { default: "", type: "string" },
          }
        : {}),
    },
  };
}
