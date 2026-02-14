import { toLambdaLayerMetadata } from "./to-lambda-layer-metadata";
import type { SqsListenerRuntimeDefinition } from "@babbstack/sqs";
import { toLambdaFunctions } from "./to-lambda-functions";
import { toRouteDynamodbAccess } from "./to-lambda-terraform-metadata";
import { toSqsListenersById } from "./to-sqs-listeners-by-id";
import { toRouteSqsSendAccess } from "./to-sqs-lambda-metadata";
import type { Contract, EndpointRuntimeDefinition } from "./types";

type TerraformJson = Record<string, unknown>;
const SQS_CONSUMER_ACTIONS = [
  "sqs:ChangeMessageVisibility",
  "sqs:DeleteMessage",
  "sqs:GetQueueAttributes",
  "sqs:ReceiveMessage",
];

function toTerraformReference(expression: string): string {
  return `\${${expression}}`;
}

export function createLambdasTerraformJson(
  contract: Contract,
  endpoints: ReadonlyArray<EndpointRuntimeDefinition>,
  sqsListeners: ReadonlyArray<SqsListenerRuntimeDefinition>,
  lambdaExternalModulesByRoute: Record<string, string[]> | undefined,
  usesManagedDynamodbTables: boolean,
  usesManagedSqsQueues: boolean,
): TerraformJson {
  const layerMetadata = toLambdaLayerMetadata(lambdaExternalModulesByRoute ?? {});
  const hasLayers = Object.keys(layerMetadata.layersByKey).length > 0;
  const routeDynamodbAccess = toRouteDynamodbAccess(endpoints);
  const routeSqsSendAccess = toRouteSqsSendAccess(endpoints);
  const sqsListenersById = toSqsListenersById(sqsListeners);
  const hasRouteDynamodbAccess = Object.keys(routeDynamodbAccess).length > 0;
  const hasRouteSqsSendAccess = Object.keys(routeSqsSendAccess).length > 0;
  const hasSqsListeners = Object.keys(sqsListenersById).length > 0;
  const hasUnmanagedSqsReferences =
    (hasRouteSqsSendAccess || hasSqsListeners) && !usesManagedSqsQueues;
  const hasUnmanagedDynamodbReferences = hasRouteDynamodbAccess && !usesManagedDynamodbTables;

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
    ...(usesManagedDynamodbTables || usesManagedSqsQueues
      ? {
          environment: {
            variables: {
              ...(usesManagedDynamodbTables
                ? {
                    SIMPLE_API_DYNAMODB_TABLE_NAME_PREFIX: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.dynamodb_table_name_prefix")}`,
                  }
                : {}),
              ...(usesManagedSqsQueues
                ? {
                    SIMPLE_API_SQS_QUEUE_NAME_PREFIX: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.sqs_queue_name_prefix")}`,
                  }
                : {}),
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
  const sqsListenerConfig: Record<string, unknown> = {
    architectures: ["arm64"],
    filename: `${toTerraformReference("var.lambda_artifacts_base_path")}/${toTerraformReference("each.key")}.zip`,
    for_each: toTerraformReference("local.sqs_listeners_by_id"),
    function_name: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.lambda_function_name_prefix")}${toTerraformReference("each.key")}`,
    handler: toTerraformReference("var.lambda_handler"),
    memory_size: toTerraformReference("each.value.memory_mb"),
    role: toTerraformReference("aws_iam_role.sqs_listener[each.key].arn"),
    runtime: "nodejs20.x",
    source_code_hash: toTerraformReference("local.lambda_source_code_hash_by_route[each.key]"),
    timeout: toTerraformReference("each.value.timeout_seconds"),
    ...(hasLayers
      ? {
          layers: toTerraformReference(
            '[for layer_key in compact([lookup(local.lambda_layer_key_by_route, each.key, "")]) : aws_lambda_layer_version.external[layer_key].arn]',
          ),
        }
      : {}),
  };
  const iamRolePolicies: Record<string, unknown> = {
    ...(hasRouteDynamodbAccess
      ? {
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
        }
      : {}),
    ...(hasRouteSqsSendAccess
      ? {
          route_sqs_send: {
            for_each: toTerraformReference("local.lambda_sqs_send_access_by_route"),
            name: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.lambda_sqs_send_policy_name_prefix")}${toTerraformReference("each.key")}`,
            policy: toTerraformReference(
              usesManagedSqsQueues
                ? `jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = each.value.actions, Resource = [aws_sqs_queue.queue[each.value.queue_key].arn] }] })`
                : `jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = each.value.actions, Resource = ["arn:aws:sqs:\${var.aws_region}:\${data.aws_caller_identity.current.account_id}:\${each.value.queue_name}"] }] })`,
            ),
            role: toTerraformReference("aws_iam_role.route[each.key].id"),
          },
        }
      : {}),
    ...(hasSqsListeners
      ? {
          sqs_listener_consume: {
            for_each: toTerraformReference("local.sqs_listeners_by_id"),
            name: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.lambda_sqs_listener_policy_name_prefix")}${toTerraformReference("each.key")}`,
            policy: toTerraformReference(
              usesManagedSqsQueues
                ? `jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = ${JSON.stringify(SQS_CONSUMER_ACTIONS)}, Resource = [aws_sqs_queue.queue[each.value.queue_key].arn] }] })`
                : `jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = ${JSON.stringify(SQS_CONSUMER_ACTIONS)}, Resource = ["arn:aws:sqs:\${var.aws_region}:\${data.aws_caller_identity.current.account_id}:\${each.value.queue_name}"] }] })`,
            ),
            role: toTerraformReference("aws_iam_role.sqs_listener[each.key].id"),
          },
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
      lambda_sqs_send_access_by_route: routeSqsSendAccess,
      sqs_listeners_by_id: sqsListenersById,
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
    ...(hasUnmanagedDynamodbReferences || hasUnmanagedSqsReferences
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
        ...(hasSqsListeners
          ? {
              sqs_listener: {
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
                for_each: toTerraformReference("local.sqs_listeners_by_id"),
                name: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.lambda_execution_role_name_prefix")}${toTerraformReference("each.key")}`,
              },
            }
          : {}),
      },
      aws_iam_role_policy_attachment: {
        route_logs: {
          for_each: toTerraformReference("local.lambda_functions"),
          policy_arn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
          role: toTerraformReference("aws_iam_role.route[each.key].name"),
        },
        ...(hasSqsListeners
          ? {
              sqs_listener_logs: {
                for_each: toTerraformReference("local.sqs_listeners_by_id"),
                policy_arn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
                role: toTerraformReference("aws_iam_role.sqs_listener[each.key].name"),
              },
            }
          : {}),
      },
      ...(Object.keys(iamRolePolicies).length > 0
        ? {
            aws_iam_role_policy: iamRolePolicies,
          }
        : {}),
      aws_lambda_function: {
        route: routeConfig,
        ...(hasSqsListeners
          ? {
              sqs_listener: sqsListenerConfig,
            }
          : {}),
      },
      ...(hasSqsListeners
        ? {
            aws_lambda_event_source_mapping: {
              sqs_listener: {
                batch_size: toTerraformReference("each.value.batch_size"),
                event_source_arn: toTerraformReference(
                  usesManagedSqsQueues
                    ? "aws_sqs_queue.queue[each.value.queue_key].arn"
                    : `"arn:aws:sqs:\${var.aws_region}:\${data.aws_caller_identity.current.account_id}:\${each.value.queue_name}"`,
                ),
                for_each: toTerraformReference("local.sqs_listeners_by_id"),
                function_name: toTerraformReference(
                  "aws_lambda_function.sqs_listener[each.key].arn",
                ),
              },
            },
          }
        : {}),
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
      lambda_sqs_listener_policy_name_prefix: { default: "", type: "string" },
      lambda_sqs_send_policy_name_prefix: { default: "", type: "string" },
      ...(usesManagedSqsQueues
        ? {
            sqs_queue_name_prefix: { default: "", type: "string" },
          }
        : {}),
      ...(hasLayers
        ? {
            lambda_layer_artifacts_base_path: { default: "layer-artifacts", type: "string" },
            lambda_layer_name_prefix: { default: "", type: "string" },
          }
        : {}),
    },
  };
}
