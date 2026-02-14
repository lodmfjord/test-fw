import type { SqsListenerRuntimeDefinition } from "@babbstack/sqs";
import type { EndpointRuntimeDefinition } from "./types";
import { toStepFunctionEndpoints } from "./to-step-function-endpoints";
import { toStepFunctionSqsListeners } from "./to-step-function-sqs-listeners";

type TerraformJson = Record<string, unknown>;

function toTerraformReference(expression: string): string {
  return `\${${expression}}`;
}

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

function toUnmanagedSqsQueueArn(queueNameExpression: string): string {
  const awsRegion = "$" + "{var.aws_region}";
  const accountId = "$" + "{data.aws_caller_identity.current.account_id}";
  return `arn:aws:sqs:${awsRegion}:${accountId}:${queueNameExpression}`;
}

export function createStepFunctionsTerraformJson(
  endpoints: ReadonlyArray<EndpointRuntimeDefinition>,
  sqsListeners: ReadonlyArray<SqsListenerRuntimeDefinition>,
  includeApiGatewayResources: boolean,
  usesManagedSqsQueues: boolean,
): TerraformJson {
  const endpointStateMachines = toStepFunctionEndpoints(endpoints);
  const sqsListenerStateMachines = toStepFunctionSqsListeners(sqsListeners);
  const hasEndpointStateMachines = Object.keys(endpointStateMachines).length > 0;
  const hasSqsListenerStateMachines = Object.keys(sqsListenerStateMachines).length > 0;
  const hasUnmanagedSqsReferences = hasSqsListenerStateMachines && !usesManagedSqsQueues;
  const listenerQueueNameExpression = "$" + "{each.value.queue_name}";
  const unmanagedSqsQueueArn = toUnmanagedSqsQueueArn(listenerQueueNameExpression);
  const iamRoles: Record<string, unknown> = {};
  const iamRolePolicies: Record<string, unknown> = {};
  const stateMachines: Record<string, unknown> = {};
  const integrations: Record<string, unknown> = {};
  const routes: Record<string, unknown> = {};
  const pipes: Record<string, unknown> = {};

  if (hasEndpointStateMachines) {
    iamRoles.step_function_route = {
      assume_role_policy: toRouteStateMachineRolePolicy(),
      for_each: toTerraformReference("local.step_function_endpoints"),
      name: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.step_function_state_machine_role_name_prefix")}${toTerraformReference("each.key")}`,
    };
    stateMachines.route = {
      definition: toTerraformReference("each.value.definition"),
      for_each: toTerraformReference("local.step_function_endpoints"),
      name: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.step_function_state_machine_name_prefix")}${toTerraformReference("each.value.state_machine_name")}`,
      role_arn: toTerraformReference("aws_iam_role.step_function_route[each.key].arn"),
      type: toTerraformReference("each.value.workflow_type"),
    };
  }

  if (hasSqsListenerStateMachines) {
    iamRoles.step_function_sqs_listener = {
      assume_role_policy: toRouteStateMachineRolePolicy(),
      for_each: toTerraformReference("local.step_function_sqs_listeners"),
      name: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.step_function_state_machine_role_name_prefix")}${toTerraformReference("each.key")}`,
    };
    stateMachines.sqs_listener = {
      definition: toTerraformReference("each.value.definition"),
      for_each: toTerraformReference("local.step_function_sqs_listeners"),
      name: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.step_function_state_machine_name_prefix")}${toTerraformReference("each.value.state_machine_name")}`,
      role_arn: toTerraformReference("aws_iam_role.step_function_sqs_listener[each.key].arn"),
      type: toTerraformReference("each.value.workflow_type"),
    };
    iamRoles.pipes_step_function_sqs_listener = {
      assume_role_policy: toPipeRolePolicy(),
      for_each: toTerraformReference("local.step_function_sqs_listeners"),
      name: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.pipes_step_function_role_name_prefix")}${toTerraformReference("each.key")}`,
    };
    iamRolePolicies.pipes_step_function_sqs_listener_source = {
      for_each: toTerraformReference("local.step_function_sqs_listeners"),
      name: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.pipes_step_function_source_policy_name_prefix")}${toTerraformReference("each.key")}`,
      policy: toTerraformReference(
        usesManagedSqsQueues
          ? 'jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = ["sqs:ChangeMessageVisibility", "sqs:DeleteMessage", "sqs:GetQueueAttributes", "sqs:ReceiveMessage"], Resource = [aws_sqs_queue.queue[each.value.queue_key].arn] }] })'
          : `jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = ["sqs:ChangeMessageVisibility", "sqs:DeleteMessage", "sqs:GetQueueAttributes", "sqs:ReceiveMessage"], Resource = ["${unmanagedSqsQueueArn}"] }] })`,
      ),
      role: toTerraformReference("aws_iam_role.pipes_step_function_sqs_listener[each.key].id"),
    };
    iamRolePolicies.pipes_step_function_sqs_listener_target = {
      for_each: toTerraformReference("local.step_function_sqs_listeners"),
      name: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.pipes_step_function_target_policy_name_prefix")}${toTerraformReference("each.key")}`,
      policy: toTerraformReference(
        'jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = each.value.start_action, Resource = [aws_sfn_state_machine.sqs_listener[each.key].arn] }] })',
      ),
      role: toTerraformReference("aws_iam_role.pipes_step_function_sqs_listener[each.key].id"),
    };
    pipes.step_function_sqs_listener = {
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

  if (includeApiGatewayResources && hasEndpointStateMachines) {
    iamRoles.apigateway_step_function_route = {
      assume_role_policy: toApiGatewayRolePolicy(),
      for_each: toTerraformReference("local.step_function_endpoints"),
      name: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.apigateway_step_function_role_name_prefix")}${toTerraformReference("each.key")}`,
    };
    iamRolePolicies.apigateway_step_function_route = {
      for_each: toTerraformReference("local.step_function_endpoints"),
      name: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.apigateway_step_function_policy_name_prefix")}${toTerraformReference("each.key")}`,
      policy: toTerraformReference(
        'jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = each.value.start_action, Resource = [aws_sfn_state_machine.route[each.key].arn] }] })',
      ),
      role: toTerraformReference("aws_iam_role.apigateway_step_function_route[each.key].id"),
    };
    integrations.step_function_route = {
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
    routes.step_function_route = {
      api_id: toTerraformReference("aws_apigatewayv2_api.http_api.id"),
      for_each: toTerraformReference("local.step_function_endpoints"),
      route_key: `${toTerraformReference("each.value.method")} ${toTerraformReference("each.value.path")}`,
      target: `integrations/${toTerraformReference("aws_apigatewayv2_integration.step_function_route[each.key].id")}`,
    };
  }

  return {
    locals: {
      step_function_endpoints: endpointStateMachines,
      step_function_sqs_listeners: sqsListenerStateMachines,
    },
    ...(hasUnmanagedSqsReferences
      ? {
          data: {
            aws_caller_identity: {
              current: {},
            },
          },
        }
      : {}),
    resource: {
      ...(Object.keys(iamRoles).length > 0
        ? {
            aws_iam_role: iamRoles,
          }
        : {}),
      ...(Object.keys(iamRolePolicies).length > 0
        ? {
            aws_iam_role_policy: iamRolePolicies,
          }
        : {}),
      ...(Object.keys(stateMachines).length > 0
        ? {
            aws_sfn_state_machine: stateMachines,
          }
        : {}),
      ...(Object.keys(integrations).length > 0
        ? {
            aws_apigatewayv2_integration: integrations,
          }
        : {}),
      ...(Object.keys(routes).length > 0
        ? {
            aws_apigatewayv2_route: routes,
          }
        : {}),
      ...(Object.keys(pipes).length > 0
        ? {
            aws_pipes_pipe: pipes,
          }
        : {}),
    },
    variable: {
      apigateway_step_function_policy_name_prefix: { default: "", type: "string" },
      apigateway_step_function_role_name_prefix: { default: "", type: "string" },
      pipes_name_prefix: { default: "", type: "string" },
      pipes_step_function_role_name_prefix: { default: "", type: "string" },
      pipes_step_function_source_policy_name_prefix: { default: "", type: "string" },
      pipes_step_function_target_policy_name_prefix: { default: "", type: "string" },
      step_function_state_machine_name_prefix: { default: "", type: "string" },
      step_function_state_machine_role_name_prefix: { default: "", type: "string" },
    },
  };
}
