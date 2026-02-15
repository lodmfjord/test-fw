/**
 * @fileoverview Implements create step functions terraform json helpers.
 */
type TerraformCollections = {
  iamRolePolicies: Record<string, unknown>;
  iamRoles: Record<string, unknown>;
  integrations: Record<string, unknown>;
  pipes: Record<string, unknown>;
  routes: Record<string, unknown>;
  stateMachines: Record<string, unknown>;
};

/** Converts values to terraform reference. */
function toTerraformReference(expression: string): string {
  return `\${${expression}}`;
}

/** Converts values to route state machine role policy. */
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

/** Converts values to api gateway role policy. */
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

/** Converts values to pipe role policy. */
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

/** Converts values to unmanaged sqs queue arn. */
function toUnmanagedSqsQueueArn(queueNameExpression: string): string {
  const awsRegion = "$" + "{var.aws_region}";
  const accountId = "$" + "{data.aws_caller_identity.current.account_id}";
  return `arn:aws:sqs:${awsRegion}:${accountId}:${queueNameExpression}`;
}

/** Creates collections. */
function createCollections(): TerraformCollections {
  return {
    iamRolePolicies: {},
    iamRoles: {},
    integrations: {},
    pipes: {},
    routes: {},
    stateMachines: {},
  };
}

/** Handles append endpoint state machine resources. */
function appendEndpointStateMachineResources(collections: TerraformCollections): void {
  collections.iamRoles.step_function_route = {
    assume_role_policy: toRouteStateMachineRolePolicy(),
    for_each: toTerraformReference("local.step_function_endpoints"),
    name: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.step_function_state_machine_role_name_prefix")}${toTerraformReference("each.key")}`,
  };
  collections.stateMachines.route = {
    definition: toTerraformReference("each.value.definition"),
    for_each: toTerraformReference("local.step_function_endpoints"),
    name: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.step_function_state_machine_name_prefix")}${toTerraformReference("each.value.state_machine_name")}`,
    role_arn: toTerraformReference("aws_iam_role.step_function_route[each.key].arn"),
    type: toTerraformReference("each.value.workflow_type"),
  };
}

/** Handles append sqs listener state machine resources. */
function appendSqsListenerStateMachineResources(
  collections: TerraformCollections,
  usesManagedSqsQueues: boolean,
): void {
  const listenerQueueNameExpression = "$" + "{each.value.queue_name}";
  const unmanagedSqsQueueArn = toUnmanagedSqsQueueArn(listenerQueueNameExpression);

  collections.iamRoles.step_function_sqs_listener = {
    assume_role_policy: toRouteStateMachineRolePolicy(),
    for_each: toTerraformReference("local.step_function_sqs_listeners"),
    name: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.step_function_state_machine_role_name_prefix")}${toTerraformReference("each.key")}`,
  };
  collections.stateMachines.sqs_listener = {
    definition: toTerraformReference("each.value.definition"),
    for_each: toTerraformReference("local.step_function_sqs_listeners"),
    name: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.step_function_state_machine_name_prefix")}${toTerraformReference("each.value.state_machine_name")}`,
    role_arn: toTerraformReference("aws_iam_role.step_function_sqs_listener[each.key].arn"),
    type: toTerraformReference("each.value.workflow_type"),
  };
  collections.iamRoles.pipes_step_function_sqs_listener = {
    assume_role_policy: toPipeRolePolicy(),
    for_each: toTerraformReference("local.step_function_sqs_listeners"),
    name: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.pipes_step_function_role_name_prefix")}${toTerraformReference("each.key")}`,
  };
  collections.iamRolePolicies.pipes_step_function_sqs_listener_source = {
    for_each: toTerraformReference("local.step_function_sqs_listeners"),
    name: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.pipes_step_function_source_policy_name_prefix")}${toTerraformReference("each.key")}`,
    policy: toTerraformReference(
      usesManagedSqsQueues
        ? 'jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = ["sqs:ChangeMessageVisibility", "sqs:DeleteMessage", "sqs:GetQueueAttributes", "sqs:ReceiveMessage"], Resource = [aws_sqs_queue.queue[each.value.queue_key].arn] }] })'
        : `jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = ["sqs:ChangeMessageVisibility", "sqs:DeleteMessage", "sqs:GetQueueAttributes", "sqs:ReceiveMessage"], Resource = ["${unmanagedSqsQueueArn}"] }] })`,
    ),
    role: toTerraformReference("aws_iam_role.pipes_step_function_sqs_listener[each.key].id"),
  };
  collections.iamRolePolicies.pipes_step_function_sqs_listener_target = {
    for_each: toTerraformReference("local.step_function_sqs_listeners"),
    name: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.pipes_step_function_target_policy_name_prefix")}${toTerraformReference("each.key")}`,
    policy: toTerraformReference(
      'jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = each.value.start_action, Resource = [aws_sfn_state_machine.sqs_listener[each.key].arn] }] })',
    ),
    role: toTerraformReference("aws_iam_role.pipes_step_function_sqs_listener[each.key].id"),
  };
  collections.pipes.step_function_sqs_listener = {
    for_each: toTerraformReference("local.step_function_sqs_listeners"),
    name: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.pipes_name_prefix")}${toTerraformReference("each.key")}`,
    role_arn: toTerraformReference("aws_iam_role.pipes_step_function_sqs_listener[each.key].arn"),
    source: toTerraformReference(
      usesManagedSqsQueues
        ? "aws_sqs_queue.queue[each.value.queue_key].arn"
        : JSON.stringify(unmanagedSqsQueueArn),
    ),
    source_parameters: {
      sqs_queue_parameters: {
        batch_size: toTerraformReference("each.value.batch_size"),
      },
    },
    target: toTerraformReference("aws_sfn_state_machine.sqs_listener[each.key].arn"),
    target_parameters: {
      step_function_state_machine_parameters: {
        invocation_type: toTerraformReference("each.value.pipe_invocation_type"),
      },
    },
  };
}

/** Handles append api gateway resources. */
function appendApiGatewayResources(collections: TerraformCollections): void {
  collections.iamRoles.apigateway_step_function_route = {
    assume_role_policy: toApiGatewayRolePolicy(),
    for_each: toTerraformReference("local.step_function_endpoints"),
    name: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.apigateway_step_function_role_name_prefix")}${toTerraformReference("each.key")}`,
  };
  collections.iamRolePolicies.apigateway_step_function_route = {
    for_each: toTerraformReference("local.step_function_endpoints"),
    name: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.apigateway_step_function_policy_name_prefix")}${toTerraformReference("each.key")}`,
    policy: toTerraformReference(
      'jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = each.value.start_action, Resource = [aws_sfn_state_machine.route[each.key].arn] }] })',
    ),
    role: toTerraformReference("aws_iam_role.apigateway_step_function_route[each.key].id"),
  };
  collections.integrations.step_function_route = {
    api_id: toTerraformReference("aws_apigatewayv2_api.http_api.id"),
    credentials_arn: toTerraformReference(
      "aws_iam_role.apigateway_step_function_route[each.key].arn",
    ),
    for_each: toTerraformReference("local.step_function_endpoints"),
    integration_subtype: toTerraformReference("each.value.integration_subtype"),
    integration_type: "AWS_PROXY",
    payload_format_version: "1.0",
    request_parameters: {
      Input: "$request.body",
      StateMachineArn: toTerraformReference("aws_sfn_state_machine.route[each.key].arn"),
    },
  };
  collections.routes.step_function_route = {
    api_id: toTerraformReference("aws_apigatewayv2_api.http_api.id"),
    for_each: toTerraformReference("local.step_function_endpoints"),
    route_key: `${toTerraformReference("each.value.method")} ${toTerraformReference("each.value.path")}`,
    target: `integrations/${toTerraformReference("aws_apigatewayv2_integration.step_function_route[each.key].id")}`,
  };
}

/** Converts values to resource block. */
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

/** Converts values to variable block. */
function toVariableBlock(): Record<string, unknown> {
  return {
    apigateway_step_function_policy_name_prefix: { default: "", type: "string" },
    apigateway_step_function_role_name_prefix: { default: "", type: "string" },
    pipes_name_prefix: { default: "", type: "string" },
    pipes_step_function_role_name_prefix: { default: "", type: "string" },
    pipes_step_function_source_policy_name_prefix: { default: "", type: "string" },
    pipes_step_function_target_policy_name_prefix: { default: "", type: "string" },
    step_function_state_machine_name_prefix: { default: "", type: "string" },
    step_function_state_machine_role_name_prefix: { default: "", type: "string" },
  };
}

export const createStepFunctionsTerraformJsonHelpers = {
  appendApiGatewayResources,
  appendEndpointStateMachineResources,
  appendSqsListenerStateMachineResources,
  createCollections,
  toResourceBlock,
  toVariableBlock,
};
