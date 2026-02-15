/**
 * @fileoverview Implements create lambdas terraform json helpers.
 */
import type { Contract } from "./types";
import { LAMBDA_SQS_CONSUMER_ACTIONS } from "./lambda-terraform-sqs-consumer-actions";
import { toLambdaFunctions } from "./to-lambda-functions";

export type LambdasTerraformContext = {
  hasLayers: boolean;
  hasRouteEphemeralStorageMb: boolean;
  hasRouteDynamodbAccess: boolean;
  hasRouteMemoryMb: boolean;
  hasRouteReservedConcurrency: boolean;
  hasRouteSecretEnvParameters: boolean;
  hasRouteS3Access: boolean;
  hasRouteSqsSendAccess: boolean;
  hasRouteTimeoutSeconds: boolean;
  hasSqsListeners: boolean;
  layerMetadata: {
    layersByKey: Record<string, unknown>;
    routeLayerKeyByRoute: Record<string, string>;
  };
  routeDynamodbAccess: Record<string, unknown>;
  routeSecretEnvParameterKeysByRoute: Record<string, string[]>;
  routeS3Access: Record<string, unknown>;
  routeSqsSendAccess: Record<string, unknown>;
  s3BucketsByKey: Record<string, unknown>;
  secretEnvParameterNameByKey: Record<string, string>;
  sqsListenersById: Record<string, unknown>;
  usesManagedDynamodbTables: boolean;
  usesManagedSqsQueues: boolean;
};

/** Converts to terraform reference. */
function toTerraformReference(expression: string): string {
  return `\${${expression}}`;
}

/** Converts to route config. */
function toRouteConfig(context: LambdasTerraformContext): Record<string, unknown> {
  const routeConfig: Record<string, unknown> = {
    architectures: [toTerraformReference("each.value.architecture")],
    filename: `${toTerraformReference("var.lambda_artifacts_base_path")}/${toTerraformReference("basename(each.value.artifact_path)")}`,
    for_each: toTerraformReference("local.lambda_functions"),
    function_name: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.lambda_function_name_prefix")}${toTerraformReference("each.key")}`,
    handler: toTerraformReference("var.lambda_handler"),
    role: toTerraformReference("aws_iam_role.route[each.key].arn"),
    runtime: toTerraformReference("each.value.runtime"),
    source_code_hash: toTerraformReference("local.lambda_source_code_hash_by_route[each.key]"),
  };

  if (context.hasRouteMemoryMb) {
    routeConfig.memory_size = toTerraformReference('lookup(each.value, "memory_mb", null)');
  }
  if (context.hasRouteTimeoutSeconds) {
    routeConfig.timeout = toTerraformReference('lookup(each.value, "timeout_seconds", null)');
  }
  if (context.hasRouteReservedConcurrency) {
    routeConfig.reserved_concurrent_executions = toTerraformReference(
      'lookup(each.value, "reserved_concurrency", null)',
    );
  }
  if (context.hasRouteEphemeralStorageMb) {
    routeConfig.dynamic = {
      ephemeral_storage: {
        content: {
          size: toTerraformReference("ephemeral_storage.value"),
        },
        for_each: toTerraformReference(
          'lookup(each.value, "ephemeral_storage_mb", null) == null ? [] : [lookup(each.value, "ephemeral_storage_mb", null)]',
        ),
      },
    };
  }

  const environmentVariables: Record<string, string> = {};
  if (context.usesManagedDynamodbTables) {
    environmentVariables.SIMPLE_API_DYNAMODB_TABLE_NAME_PREFIX = `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.dynamodb_table_name_prefix")}`;
  }
  if (context.usesManagedSqsQueues) {
    environmentVariables.SIMPLE_API_SQS_QUEUE_NAME_PREFIX = `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.sqs_queue_name_prefix")}`;
  }
  if (context.hasRouteS3Access) {
    environmentVariables.SIMPLE_API_S3_BUCKET_NAME_PREFIX = `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.s3_bucket_name_prefix")}`;
  }
  if (Object.keys(environmentVariables).length > 0) {
    routeConfig.environment = {
      variables: environmentVariables,
    };
  }

  if (context.hasLayers) {
    routeConfig.layers = toTerraformReference(
      '[for layer_key in compact([lookup(local.lambda_layer_key_by_route, each.key, "")]) : aws_lambda_layer_version.external[layer_key].arn]',
    );
  }

  return routeConfig;
}

/** Converts to sqs listener config. */
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

/** Converts to iam role policies. */
function toIamRolePolicies(context: LambdasTerraformContext): Record<string, unknown> {
  const policies: Record<string, unknown> = {};
  const routeDynamodbPolicySource = context.usesManagedDynamodbTables
    ? `jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = each.value.actions, Resource = [aws_dynamodb_table.table[each.value.table_key].arn, "\${aws_dynamodb_table.table[each.value.table_key].arn}/index/*"] }] })`
    : `jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = each.value.actions, Resource = ["arn:aws:dynamodb:\${var.aws_region}:\${data.aws_caller_identity.current.account_id}:table/\${each.value.table_name}", "arn:aws:dynamodb:\${var.aws_region}:\${data.aws_caller_identity.current.account_id}:table/\${each.value.table_name}/index/*"] }] })`;
  const routeSqsPolicySource = context.usesManagedSqsQueues
    ? `jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = each.value.actions, Resource = [aws_sqs_queue.queue[each.value.queue_key].arn] }] })`
    : `jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = each.value.actions, Resource = ["arn:aws:sqs:\${var.aws_region}:\${data.aws_caller_identity.current.account_id}:\${each.value.queue_name}"] }] })`;
  const s3ObjectArnReference = "$" + "{aws_s3_bucket.route_s3[each.value.bucket_key].arn}";
  const routeS3PolicySource = `jsonencode({ Version = "2012-10-17", Statement = concat(length(each.value.bucket_actions) > 0 ? [{ Effect = "Allow", Action = each.value.bucket_actions, Resource = [aws_s3_bucket.route_s3[each.value.bucket_key].arn] }] : [], length(each.value.object_actions) > 0 ? [{ Effect = "Allow", Action = each.value.object_actions, Resource = ["${s3ObjectArnReference}/*"] }] : []) })`;
  const routeSsmPolicySource =
    'jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = ["ssm:GetParameter"], Resource = [for parameter_key in each.value : data.aws_ssm_parameter.lambda_secret_env[parameter_key].arn] }] })';
  const listenerConsumePolicySource = context.usesManagedSqsQueues
    ? `jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = ${JSON.stringify(LAMBDA_SQS_CONSUMER_ACTIONS)}, Resource = [aws_sqs_queue.queue[each.value.queue_key].arn] }] })`
    : `jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = ${JSON.stringify(LAMBDA_SQS_CONSUMER_ACTIONS)}, Resource = ["arn:aws:sqs:\${var.aws_region}:\${data.aws_caller_identity.current.account_id}:\${each.value.queue_name}"] }] })`;

  if (context.hasRouteDynamodbAccess) {
    policies.route_dynamodb = {
      for_each: toTerraformReference("local.lambda_dynamodb_access_by_route"),
      name: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.lambda_dynamodb_policy_name_prefix")}${toTerraformReference("each.key")}`,
      policy: toTerraformReference(routeDynamodbPolicySource),
      role: toTerraformReference("aws_iam_role.route[each.key].id"),
    };
  }

  if (context.hasRouteSqsSendAccess) {
    policies.route_sqs_send = {
      for_each: toTerraformReference("local.lambda_sqs_send_access_by_route"),
      name: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.lambda_sqs_send_policy_name_prefix")}${toTerraformReference("each.key")}`,
      policy: toTerraformReference(routeSqsPolicySource),
      role: toTerraformReference("aws_iam_role.route[each.key].id"),
    };
  }

  if (context.hasRouteS3Access) {
    policies.route_s3 = {
      for_each: toTerraformReference("local.lambda_s3_access_by_route"),
      name: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.lambda_s3_policy_name_prefix")}${toTerraformReference("each.key")}`,
      policy: toTerraformReference(routeS3PolicySource),
      role: toTerraformReference("aws_iam_role.route[each.key].id"),
    };
  }

  if (context.hasRouteSecretEnvParameters) {
    policies.route_ssm_parameter = {
      for_each: toTerraformReference("local.lambda_secret_env_parameter_keys_by_route"),
      name: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.lambda_ssm_parameter_policy_name_prefix")}${toTerraformReference("each.key")}`,
      policy: toTerraformReference(routeSsmPolicySource),
      role: toTerraformReference("aws_iam_role.route[each.key].id"),
    };
  }
  if (context.hasSqsListeners) {
    policies.sqs_listener_consume = {
      for_each: toTerraformReference("local.sqs_listeners_by_id"),
      name: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.lambda_sqs_listener_policy_name_prefix")}${toTerraformReference("each.key")}`,
      policy: toTerraformReference(listenerConsumePolicySource),
      role: toTerraformReference("aws_iam_role.sqs_listener[each.key].id"),
    };
  }
  return policies;
}

/** Converts to locals. */
function toLocals(contract: Contract, context: LambdasTerraformContext): Record<string, unknown> {
  return {
    lambda_functions: toLambdaFunctions(contract),
    lambda_source_code_hash_by_route: toTerraformReference(
      `jsondecode(file("\${var.lambda_artifacts_base_path}/source-code-hashes.json"))`,
    ),
    lambda_dynamodb_access_by_route: context.routeDynamodbAccess,
    lambda_s3_buckets_by_key: context.s3BucketsByKey,
    lambda_s3_access_by_route: context.routeS3Access,
    lambda_secret_env_parameter_keys_by_route: context.routeSecretEnvParameterKeysByRoute,
    lambda_secret_env_parameter_name_by_key: context.secretEnvParameterNameByKey,
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
const createLambdasTerraformJsonHelpers = {
  toIamRolePolicies,
  toLocals,
  toRouteConfig,
  toSqsListenerConfig,
};
export { createLambdasTerraformJsonHelpers };
