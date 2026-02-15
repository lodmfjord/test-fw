/**
 * @fileoverview Implements shared step-function terraform json helpers.
 */

type TerraformCollections = {
  iamRolePolicies: Record<string, unknown>;
  iamRoles: Record<string, unknown>;
  integrations: Record<string, unknown>;
  pipes: Record<string, unknown>;
  routes: Record<string, unknown>;
  stateMachines: Record<string, unknown>;
};

/** Converts to terraform reference. */
function toTerraformReference(expression: string): string {
  return `\${${expression}}`;
}

/** Converts to non-empty terraform prefix reference. */
function toNonEmptyPrefixReference(variableName: string, fallbackPrefix: string): string {
  return toTerraformReference(
    `var.${variableName} != "" ? var.${variableName} : "${fallbackPrefix}"`,
  );
}

/** Converts to route state machine role policy. */
function toRouteStateMachineRolePolicy(): string {
  return JSON.stringify({
    Statement: [
      {
        Action: "sts:AssumeRole",
        Effect: "Allow",
        Principal: {
          Service: "states.amazonaws.com",
        },
      },
    ],
    Version: "2012-10-17",
  });
}

/** Converts to api gateway role policy. */
function toApiGatewayRolePolicy(): string {
  return JSON.stringify({
    Statement: [
      {
        Action: "sts:AssumeRole",
        Effect: "Allow",
        Principal: {
          Service: "apigateway.amazonaws.com",
        },
      },
    ],
    Version: "2012-10-17",
  });
}

/** Converts to pipe role policy. */
function toPipeRolePolicy(): string {
  return JSON.stringify({
    Statement: [
      {
        Action: "sts:AssumeRole",
        Effect: "Allow",
        Principal: {
          Service: "pipes.amazonaws.com",
        },
      },
    ],
    Version: "2012-10-17",
  });
}

/** Converts to unmanaged sqs queue arn. */
function toUnmanagedSqsQueueArn(queueNameExpression: string): string {
  const awsRegion = "$" + "{var.aws_region}";
  const accountId = "$" + "{data.aws_caller_identity.current.account_id}";
  return `arn:aws:sqs:${awsRegion}:${accountId}:${queueNameExpression}`;
}

/** Converts to resource block. */
function toResourceBlock(collections: TerraformCollections): Record<string, unknown> {
  return {
    ...(Object.keys(collections.iamRoles).length > 0
      ? {
          aws_iam_role: collections.iamRoles,
        }
      : {}),
    ...(Object.keys(collections.iamRolePolicies).length > 0
      ? {
          aws_iam_role_policy: collections.iamRolePolicies,
        }
      : {}),
    ...(Object.keys(collections.stateMachines).length > 0
      ? {
          aws_sfn_state_machine: collections.stateMachines,
        }
      : {}),
    ...(Object.keys(collections.integrations).length > 0
      ? {
          aws_apigatewayv2_integration: collections.integrations,
        }
      : {}),
    ...(Object.keys(collections.routes).length > 0
      ? {
          aws_apigatewayv2_route: collections.routes,
        }
      : {}),
    ...(Object.keys(collections.pipes).length > 0
      ? {
          aws_pipes_pipe: collections.pipes,
        }
      : {}),
  };
}

/** Converts to variable block. */
function toVariableBlock(): Record<string, unknown> {
  return {
    apigateway_step_function_policy_name_prefix: { default: "apigw-", type: "string" },
    apigateway_step_function_role_name_prefix: { default: "apigw-", type: "string" },
    pipes_name_prefix: { default: "", type: "string" },
    pipes_step_function_role_name_prefix: { default: "pipes-", type: "string" },
    pipes_step_function_source_policy_name_prefix: { default: "pipes-src-", type: "string" },
    pipes_step_function_target_policy_name_prefix: { default: "pipes-tgt-", type: "string" },
    step_function_lambda_invoke_policy_name_prefix: { default: "sfn-lambda-", type: "string" },
    step_function_state_machine_name_prefix: { default: "", type: "string" },
    step_function_state_machine_role_name_prefix: { default: "sfn-", type: "string" },
  };
}

const createStepFunctionsTerraformJsonCommon = {
  toNonEmptyPrefixReference,
  toApiGatewayRolePolicy,
  toPipeRolePolicy,
  toResourceBlock,
  toRouteStateMachineRolePolicy,
  toTerraformReference,
  toUnmanagedSqsQueueArn,
  toVariableBlock,
};

export { createStepFunctionsTerraformJsonCommon };
