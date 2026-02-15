/**
 * @fileoverview Implements create lambdas terraform json helpers.
 */
import type { Contract } from "./types";
import { toLambdaFunctions } from "./to-lambda-functions";

const SQS_CONSUMER_ACTIONS = [
  "sqs:ChangeMessageVisibility",
  "sqs:DeleteMessage",
  "sqs:GetQueueAttributes",
  "sqs:ReceiveMessage",
];

export type LambdasTerraformContext = {
  hasLayers: boolean;
  hasRouteDynamodbAccess: boolean;
  hasRouteSqsSendAccess: boolean;
  hasSqsListeners: boolean;
  layerMetadata: {
    layersByKey: Record<string, unknown>;
    routeLayerKeyByRoute: Record<string, string>;
  };
  routeDynamodbAccess: Record<string, unknown>;
  routeSqsSendAccess: Record<string, unknown>;
  sqsListenersById: Record<string, unknown>;
  usesManagedDynamodbTables: boolean;
  usesManagedSqsQueues: boolean;
};

/** Converts values to terraform reference. */
function toTerraformReference(expression: string): string {
  return `\${${expression}}`;
}

/** Converts values to route config. */
function toRouteConfig(context: LambdasTerraformContext): Record<string, unknown> {
  return {
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
    ...(context.usesManagedDynamodbTables || context.usesManagedSqsQueues
      ? {
          environment: {
            variables: {
              ...(context.usesManagedDynamodbTables
                ? {
                    SIMPLE_API_DYNAMODB_TABLE_NAME_PREFIX: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.dynamodb_table_name_prefix")}`,
                  }
                : {}),
              ...(context.usesManagedSqsQueues
                ? {
                    SIMPLE_API_SQS_QUEUE_NAME_PREFIX: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.sqs_queue_name_prefix")}`,
                  }
                : {}),
            },
          },
        }
      : {}),
    ...(context.hasLayers
      ? {
          layers: toTerraformReference(
            '[for layer_key in compact([lookup(local.lambda_layer_key_by_route, each.key, "")]) : aws_lambda_layer_version.external[layer_key].arn]',
          ),
        }
      : {}),
  };
}

/** Converts values to sqs listener config. */
function toSqsListenerConfig(context: LambdasTerraformContext): Record<string, unknown> {
  return {
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
    ...(context.hasLayers
      ? {
          layers: toTerraformReference(
            '[for layer_key in compact([lookup(local.lambda_layer_key_by_route, each.key, "")]) : aws_lambda_layer_version.external[layer_key].arn]',
          ),
        }
      : {}),
  };
}

/** Converts values to iam role policies. */
function toIamRolePolicies(context: LambdasTerraformContext): Record<string, unknown> {
  return {
    ...(context.hasRouteDynamodbAccess
      ? {
          route_dynamodb: {
            for_each: toTerraformReference("local.lambda_dynamodb_access_by_route"),
            name: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.lambda_dynamodb_policy_name_prefix")}${toTerraformReference("each.key")}`,
            policy: toTerraformReference(
              context.usesManagedDynamodbTables
                ? `jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = each.value.actions, Resource = [aws_dynamodb_table.table[each.value.table_key].arn, "\${aws_dynamodb_table.table[each.value.table_key].arn}/index/*"] }] })`
                : `jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = each.value.actions, Resource = ["arn:aws:dynamodb:\${var.aws_region}:\${data.aws_caller_identity.current.account_id}:table/\${each.value.table_name}", "arn:aws:dynamodb:\${var.aws_region}:\${data.aws_caller_identity.current.account_id}:table/\${each.value.table_name}/index/*"] }] })`,
            ),
            role: toTerraformReference("aws_iam_role.route[each.key].id"),
          },
        }
      : {}),
    ...(context.hasRouteSqsSendAccess
      ? {
          route_sqs_send: {
            for_each: toTerraformReference("local.lambda_sqs_send_access_by_route"),
            name: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.lambda_sqs_send_policy_name_prefix")}${toTerraformReference("each.key")}`,
            policy: toTerraformReference(
              context.usesManagedSqsQueues
                ? `jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = each.value.actions, Resource = [aws_sqs_queue.queue[each.value.queue_key].arn] }] })`
                : `jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = each.value.actions, Resource = ["arn:aws:sqs:\${var.aws_region}:\${data.aws_caller_identity.current.account_id}:\${each.value.queue_name}"] }] })`,
            ),
            role: toTerraformReference("aws_iam_role.route[each.key].id"),
          },
        }
      : {}),
    ...(context.hasSqsListeners
      ? {
          sqs_listener_consume: {
            for_each: toTerraformReference("local.sqs_listeners_by_id"),
            name: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.lambda_sqs_listener_policy_name_prefix")}${toTerraformReference("each.key")}`,
            policy: toTerraformReference(
              context.usesManagedSqsQueues
                ? `jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = ${JSON.stringify(SQS_CONSUMER_ACTIONS)}, Resource = [aws_sqs_queue.queue[each.value.queue_key].arn] }] })`
                : `jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = ${JSON.stringify(SQS_CONSUMER_ACTIONS)}, Resource = ["arn:aws:sqs:\${var.aws_region}:\${data.aws_caller_identity.current.account_id}:\${each.value.queue_name}"] }] })`,
            ),
            role: toTerraformReference("aws_iam_role.sqs_listener[each.key].id"),
          },
        }
      : {}),
  };
}

/** Converts values to locals. */
function toLocals(contract: Contract, context: LambdasTerraformContext): Record<string, unknown> {
  return {
    lambda_functions: toLambdaFunctions(contract),
    lambda_source_code_hash_by_route: toTerraformReference(
      `jsondecode(file("\${var.lambda_artifacts_base_path}/source-code-hashes.json"))`,
    ),
    lambda_dynamodb_access_by_route: context.routeDynamodbAccess,
    lambda_sqs_send_access_by_route: context.routeSqsSendAccess,
    sqs_listeners_by_id: context.sqsListenersById,
    ...(context.hasLayers
      ? {
          external_layers: context.layerMetadata.layersByKey,
          external_layer_source_code_hash_by_key: toTerraformReference(
            `jsondecode(file("\${var.lambda_layer_artifacts_base_path}/source-code-hashes.json"))`,
          ),
          lambda_layer_key_by_route: context.layerMetadata.routeLayerKeyByRoute,
        }
      : {}),
  };
}

export const createLambdasTerraformJsonHelpers = {
  toIamRolePolicies,
  toLocals,
  toRouteConfig,
  toSqsListenerConfig,
};
