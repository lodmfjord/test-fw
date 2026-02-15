/**
 * @fileoverview Implements create step functions terraform json helpers.
 */
import { createStepFunctionsTerraformJsonCommon } from "./create-step-functions-terraform-json-common";
type TerraformCollections = {
  iamRolePolicies: Record<string, unknown>;
  iamRoles: Record<string, unknown>;
  integrations: Record<string, unknown>;
  pipes: Record<string, unknown>;
  routes: Record<string, unknown>;
  stateMachines: Record<string, unknown>;
};

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

/** Runs append endpoint state machine resources. */
function appendEndpointStateMachineResources(collections: TerraformCollections): void {
  const { toNonEmptyPrefixReference, toRouteStateMachineRolePolicy, toTerraformReference } =
    createStepFunctionsTerraformJsonCommon;
  const stateMachineRolePrefix = toNonEmptyPrefixReference(
    "step_function_state_machine_role_name_prefix",
    "sfn-",
  );
  const lambdaInvokePolicyPrefix = toNonEmptyPrefixReference(
    "step_function_lambda_invoke_policy_name_prefix",
    "sfn-lambda-",
  );
  collections.iamRoles.step_function_route = {
    assume_role_policy: toRouteStateMachineRolePolicy(),
    for_each: toTerraformReference("local.step_function_endpoints"),
    name: `${toTerraformReference("local.resource_name_prefix")}${stateMachineRolePrefix}${toTerraformReference("each.key")}`,
  };
  collections.iamRolePolicies.step_function_route_lambda_invoke = {
    for_each: toTerraformReference(
      "{for key, value in local.step_function_endpoints : key => value if length(value.lambda_resource_arns) > 0}",
    ),
    name: `${toTerraformReference("local.resource_name_prefix")}${lambdaInvokePolicyPrefix}${toTerraformReference("each.key")}`,
    policy: toTerraformReference(
      'jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = ["lambda:InvokeFunction"], Resource = each.value.lambda_resource_arns }] })',
    ),
    role: toTerraformReference("aws_iam_role.step_function_route[each.key].id"),
  };
  collections.stateMachines.route = {
    definition: toTerraformReference("each.value.definition"),
    for_each: toTerraformReference("local.step_function_endpoints"),
    name: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.step_function_state_machine_name_prefix")}${toTerraformReference("each.value.state_machine_name")}`,
    role_arn: toTerraformReference("aws_iam_role.step_function_route[each.key].arn"),
    type: toTerraformReference("each.value.workflow_type"),
  };
}

/** Runs append sqs listener state machine resources. */
function appendSqsListenerStateMachineResources(
  collections: TerraformCollections,
  usesManagedSqsQueues: boolean,
): void {
  const {
    toNonEmptyPrefixReference,
    toPipeRolePolicy,
    toRouteStateMachineRolePolicy,
    toTerraformReference,
    toUnmanagedSqsQueueArn,
  } = createStepFunctionsTerraformJsonCommon;
  const stateMachineRolePrefix = toNonEmptyPrefixReference(
    "step_function_state_machine_role_name_prefix",
    "sfn-",
  );
  const pipeRolePrefix = toNonEmptyPrefixReference(
    "pipes_step_function_role_name_prefix",
    "pipes-",
  );
  const lambdaInvokePolicyPrefix = toNonEmptyPrefixReference(
    "step_function_lambda_invoke_policy_name_prefix",
    "sfn-lambda-",
  );
  const pipeSourcePolicyPrefix = toNonEmptyPrefixReference(
    "pipes_step_function_source_policy_name_prefix",
    "pipes-src-",
  );
  const pipeTargetPolicyPrefix = toNonEmptyPrefixReference(
    "pipes_step_function_target_policy_name_prefix",
    "pipes-tgt-",
  );
  const listenerQueueNameExpression = "$" + "{each.value.queue_name}";
  const unmanagedSqsQueueArn = toUnmanagedSqsQueueArn(listenerQueueNameExpression);

  collections.iamRoles.step_function_sqs_listener = {
    assume_role_policy: toRouteStateMachineRolePolicy(),
    for_each: toTerraformReference("local.step_function_sqs_listeners"),
    name: `${toTerraformReference("local.resource_name_prefix")}${stateMachineRolePrefix}${toTerraformReference("each.key")}`,
  };
  collections.stateMachines.sqs_listener = {
    definition: toTerraformReference("each.value.definition"),
    for_each: toTerraformReference("local.step_function_sqs_listeners"),
    name: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.step_function_state_machine_name_prefix")}${toTerraformReference("each.value.state_machine_name")}`,
    role_arn: toTerraformReference("aws_iam_role.step_function_sqs_listener[each.key].arn"),
    type: toTerraformReference("each.value.workflow_type"),
  };
  collections.iamRolePolicies.step_function_sqs_listener_lambda_invoke = {
    for_each: toTerraformReference(
      "{for key, value in local.step_function_sqs_listeners : key => value if length(value.lambda_resource_arns) > 0}",
    ),
    name: `${toTerraformReference("local.resource_name_prefix")}${lambdaInvokePolicyPrefix}${toTerraformReference("each.key")}`,
    policy: toTerraformReference(
      'jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = ["lambda:InvokeFunction"], Resource = each.value.lambda_resource_arns }] })',
    ),
    role: toTerraformReference("aws_iam_role.step_function_sqs_listener[each.key].id"),
  };
  collections.iamRoles.pipes_step_function_sqs_listener = {
    assume_role_policy: toPipeRolePolicy(),
    for_each: toTerraformReference("local.step_function_sqs_listeners"),
    name: `${toTerraformReference("local.resource_name_prefix")}${pipeRolePrefix}${toTerraformReference("each.key")}`,
  };
  collections.iamRolePolicies.pipes_step_function_sqs_listener_source = {
    for_each: toTerraformReference("local.step_function_sqs_listeners"),
    name: `${toTerraformReference("local.resource_name_prefix")}${pipeSourcePolicyPrefix}${toTerraformReference("each.key")}`,
    policy: toTerraformReference(
      usesManagedSqsQueues
        ? 'jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = ["sqs:ChangeMessageVisibility", "sqs:DeleteMessage", "sqs:GetQueueAttributes", "sqs:ReceiveMessage"], Resource = [aws_sqs_queue.queue[each.value.queue_key].arn] }] })'
        : `jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = ["sqs:ChangeMessageVisibility", "sqs:DeleteMessage", "sqs:GetQueueAttributes", "sqs:ReceiveMessage"], Resource = ["${unmanagedSqsQueueArn}"] }] })`,
    ),
    role: toTerraformReference("aws_iam_role.pipes_step_function_sqs_listener[each.key].id"),
  };
  collections.iamRolePolicies.pipes_step_function_sqs_listener_target = {
    for_each: toTerraformReference("local.step_function_sqs_listeners"),
    name: `${toTerraformReference("local.resource_name_prefix")}${pipeTargetPolicyPrefix}${toTerraformReference("each.key")}`,
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

/** Runs append api gateway resources. */
function appendApiGatewayResources(collections: TerraformCollections): void {
  const { toApiGatewayRolePolicy, toNonEmptyPrefixReference, toTerraformReference } =
    createStepFunctionsTerraformJsonCommon;
  const apiGatewayRolePrefix = toNonEmptyPrefixReference(
    "apigateway_step_function_role_name_prefix",
    "apigw-",
  );
  const apiGatewayPolicyPrefix = toNonEmptyPrefixReference(
    "apigateway_step_function_policy_name_prefix",
    "apigw-",
  );
  collections.iamRoles.apigateway_step_function_route = {
    assume_role_policy: toApiGatewayRolePolicy(),
    for_each: toTerraformReference("local.step_function_endpoints"),
    name: `${toTerraformReference("local.resource_name_prefix")}${apiGatewayRolePrefix}${toTerraformReference("each.key")}`,
  };
  collections.iamRolePolicies.apigateway_step_function_route = {
    for_each: toTerraformReference("local.step_function_endpoints"),
    name: `${toTerraformReference("local.resource_name_prefix")}${apiGatewayPolicyPrefix}${toTerraformReference("each.key")}`,
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
const createStepFunctionsTerraformJsonHelpers = {
  appendApiGatewayResources,
  appendEndpointStateMachineResources,
  appendSqsListenerStateMachineResources,
  createCollections,
  toResourceBlock: createStepFunctionsTerraformJsonCommon.toResourceBlock,
  toVariableBlock: createStepFunctionsTerraformJsonCommon.toVariableBlock,
};
export { createStepFunctionsTerraformJsonHelpers };
