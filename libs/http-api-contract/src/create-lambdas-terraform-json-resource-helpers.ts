/** @fileoverview Implements create lambdas terraform json resource helpers. @module libs/http-api-contract/src/create-lambdas-terraform-json-resource-helpers */
import type { LambdasTerraformContext } from "./create-lambdas-terraform-json-helpers";

/** Converts values to terraform reference. */
function toTerraformReference(expression: string): string {
  return `\${${expression}}`;
}

/** Converts values to resource block. */
function toResourceBlock(
  context: LambdasTerraformContext,
  iamRolePolicies: Record<string, unknown>,
  routeConfig: Record<string, unknown>,
  sqsListenerConfig: Record<string, unknown>,
): Record<string, unknown> {
  return {
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
      ...(context.hasSqsListeners
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
      ...(context.hasSqsListeners
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
      ...(context.hasSqsListeners
        ? {
            sqs_listener: sqsListenerConfig,
          }
        : {}),
    },
    ...(context.hasSqsListeners
      ? {
          aws_lambda_event_source_mapping: {
            sqs_listener: {
              batch_size: toTerraformReference("each.value.batch_size"),
              event_source_arn: toTerraformReference(
                context.usesManagedSqsQueues
                  ? "aws_sqs_queue.queue[each.value.queue_key].arn"
                  : `"arn:aws:sqs:\${var.aws_region}:\${data.aws_caller_identity.current.account_id}:\${each.value.queue_name}"`,
              ),
              for_each: toTerraformReference("local.sqs_listeners_by_id"),
              function_name: toTerraformReference("aws_lambda_function.sqs_listener[each.key].arn"),
            },
          },
        }
      : {}),
    ...(context.hasLayers
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
  };
}

/** Converts values to variable block. */
function toVariableBlock(context: LambdasTerraformContext): Record<string, unknown> {
  return {
    lambda_artifacts_base_path: { default: "lambda-artifacts", type: "string" },
    lambda_dynamodb_policy_name_prefix: { default: "", type: "string" },
    lambda_execution_role_name_prefix: { default: "", type: "string" },
    lambda_function_name_prefix: { default: "", type: "string" },
    lambda_handler: { default: "index.handler", type: "string" },
    lambda_sqs_listener_policy_name_prefix: { default: "", type: "string" },
    lambda_sqs_send_policy_name_prefix: { default: "", type: "string" },
    ...(context.usesManagedSqsQueues
      ? {
          sqs_queue_name_prefix: { default: "", type: "string" },
        }
      : {}),
    ...(context.hasLayers
      ? {
          lambda_layer_artifacts_base_path: { default: "layer-artifacts", type: "string" },
          lambda_layer_name_prefix: { default: "", type: "string" },
        }
      : {}),
  };
}

export const createLambdasTerraformJsonResourceHelpers = {
  toResourceBlock,
  toVariableBlock,
};
