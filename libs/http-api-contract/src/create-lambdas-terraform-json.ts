import { toLambdaLayerMetadata } from "./to-lambda-layer-metadata";
import type { Contract, EndpointRuntimeDefinition } from "./types";

type TerraformJson = Record<string, unknown>;
type LambdaDynamodbAccess = {
  actions: string[];
  table_key: string;
  table_name: string;
};

const DYNAMODB_READ_ACTIONS = [
  "dynamodb:BatchGetItem",
  "dynamodb:ConditionCheckItem",
  "dynamodb:DescribeTable",
  "dynamodb:GetItem",
  "dynamodb:Query",
  "dynamodb:Scan",
];
const DYNAMODB_WRITE_ACTIONS = [
  "dynamodb:BatchWriteItem",
  "dynamodb:DeleteItem",
  "dynamodb:PutItem",
  "dynamodb:UpdateItem",
];

function toTerraformReference(expression: string): string {
  return `\${${expression}}`;
}

function toTableKey(tableName: string): string {
  return tableName.replace(/[^a-zA-Z0-9_]/g, "_");
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

function toRouteDynamodbAccess(
  endpoints: ReadonlyArray<EndpointRuntimeDefinition>,
): Record<string, LambdaDynamodbAccess> {
  const accessByRoute = new Map<string, LambdaDynamodbAccess>();

  for (const endpoint of endpoints) {
    const runtime = endpoint.context?.database?.runtime;
    if (!runtime) {
      continue;
    }

    const mode = endpoint.context?.database?.access.includes("write") ? "write" : "read";
    accessByRoute.set(endpoint.routeId, {
      actions:
        mode === "write"
          ? [...DYNAMODB_READ_ACTIONS, ...DYNAMODB_WRITE_ACTIONS]
          : [...DYNAMODB_READ_ACTIONS],
      table_key: toTableKey(runtime.tableName),
      table_name: runtime.tableName,
    });
  }

  const sortedEntries = [...accessByRoute.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  );
  return Object.fromEntries(sortedEntries);
}

export function createLambdasTerraformJson(
  contract: Contract,
  endpoints: ReadonlyArray<EndpointRuntimeDefinition>,
  lambdaExternalModulesByRoute: Record<string, string[]> | undefined,
  usesManagedDynamodbTables: boolean,
): TerraformJson {
  const layerMetadata = toLambdaLayerMetadata(lambdaExternalModulesByRoute ?? {});
  const hasLayers = Object.keys(layerMetadata.layersByKey).length > 0;
  const routeDynamodbAccess = toRouteDynamodbAccess(endpoints);
  const hasRouteDynamodbAccess = Object.keys(routeDynamodbAccess).length > 0;

  const routeConfig: Record<string, unknown> = {
    architectures: [toTerraformReference("each.value.architecture")],
    filename: `${toTerraformReference("var.lambda_artifacts_base_path")}/${toTerraformReference("basename(each.value.artifact_path)")}`,
    for_each: toTerraformReference("local.lambda_functions"),
    function_name: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.lambda_function_name_prefix")}${toTerraformReference("each.key")}`,
    handler: toTerraformReference("var.lambda_handler"),
    memory_size: toTerraformReference("each.value.memory_mb"),
    role: toTerraformReference("aws_iam_role.route[each.key].arn"),
    runtime: toTerraformReference("each.value.runtime"),
    source_code_hash: toTerraformReference("local.lambda_source_code_hash_by_route[each.key]"),
    timeout: toTerraformReference("each.value.timeout_seconds"),
    ...(usesManagedDynamodbTables
      ? {
          environment: {
            variables: {
              SIMPLE_API_DYNAMODB_TABLE_NAME_PREFIX: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.dynamodb_table_name_prefix")}`,
            },
          },
        }
      : {}),
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
      lambda_source_code_hash_by_route: toTerraformReference(
        `jsondecode(file("\${var.lambda_artifacts_base_path}/source-code-hashes.json"))`,
      ),
      lambda_dynamodb_access_by_route: routeDynamodbAccess,
      ...(hasLayers
        ? {
            external_layers: layerMetadata.layersByKey,
            external_layer_source_code_hash_by_key: toTerraformReference(
              `jsondecode(file("\${var.lambda_layer_artifacts_base_path}/source-code-hashes.json"))`,
            ),
            lambda_layer_key_by_route: layerMetadata.routeLayerKeyByRoute,
          }
        : {}),
    },
    ...(hasRouteDynamodbAccess && !usesManagedDynamodbTables
      ? {
          data: {
            aws_caller_identity: {
              current: {},
            },
          },
        }
      : {}),
    resource: {
      aws_iam_role: {
        route: {
          assume_role_policy: JSON.stringify({
            Statement: [
              {
                Action: "sts:AssumeRole",
                Effect: "Allow",
                Principal: {
                  Service: "lambda.amazonaws.com",
                },
              },
            ],
            Version: "2012-10-17",
          }),
          for_each: toTerraformReference("local.lambda_functions"),
          name: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.lambda_execution_role_name_prefix")}${toTerraformReference("each.key")}`,
        },
      },
      aws_iam_role_policy_attachment: {
        route_logs: {
          for_each: toTerraformReference("local.lambda_functions"),
          policy_arn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
          role: toTerraformReference("aws_iam_role.route[each.key].name"),
        },
      },
      ...(hasRouteDynamodbAccess
        ? {
            aws_iam_role_policy: {
              route_dynamodb: {
                for_each: toTerraformReference("local.lambda_dynamodb_access_by_route"),
                name: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.lambda_dynamodb_policy_name_prefix")}${toTerraformReference("each.key")}`,
                policy: toTerraformReference(
                  usesManagedDynamodbTables
                    ? `jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = each.value.actions, Resource = [aws_dynamodb_table.table[each.value.table_key].arn, "\${aws_dynamodb_table.table[each.value.table_key].arn}/index/*"] }] })`
                    : `jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = each.value.actions, Resource = ["arn:aws:dynamodb:\${var.aws_region}:\${data.aws_caller_identity.current.account_id}:table/\${each.value.table_name}", "arn:aws:dynamodb:\${var.aws_region}:\${data.aws_caller_identity.current.account_id}:table/\${each.value.table_name}/index/*"] }] })`,
                ),
                role: toTerraformReference("aws_iam_role.route[each.key].id"),
              },
            },
          }
        : {}),
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
                source_code_hash: toTerraformReference(
                  "local.external_layer_source_code_hash_by_key[each.key]",
                ),
              },
            },
          }
        : {}),
    },
    variable: {
      lambda_artifacts_base_path: { default: "lambda-artifacts", type: "string" },
      lambda_dynamodb_policy_name_prefix: { default: "", type: "string" },
      lambda_execution_role_name_prefix: { default: "", type: "string" },
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
