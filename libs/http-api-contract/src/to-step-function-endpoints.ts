/**
 * @fileoverview Implements to step function endpoints.
 */
import type { EndpointRuntimeDefinition } from "./types";
import { toDeployableStepFunctionDefinitionJson } from "./to-deployable-step-function-definition-json";
import { toStepFunctionLambdaResourceArns } from "./to-step-function-lambda-resource-arns";

type StepFunctionEndpointConfig = {
  definition: string;
  integration_subtype: "StepFunctions-StartExecution" | "StepFunctions-StartSyncExecution";
  invocation_type: "sync" | "async";
  lambda_resource_arns: string[];
  method: string;
  path: string;
  start_action: "states:StartExecution" | "states:StartSyncExecution";
  state_machine_name: string;
  workflow_type: "STANDARD" | "EXPRESS";
};

/** Converts to integration subtype. */
function toIntegrationSubtype(
  invocationType: "sync" | "async",
): StepFunctionEndpointConfig["integration_subtype"] {
  if (invocationType === "sync") {
    return "StepFunctions-StartSyncExecution";
  }

  return "StepFunctions-StartExecution";
}

/** Converts to start action. */
function toStartAction(
  invocationType: "sync" | "async",
): StepFunctionEndpointConfig["start_action"] {
  if (invocationType === "sync") {
    return "states:StartSyncExecution";
  }

  return "states:StartExecution";
}

/**
 * Converts to step function endpoints.
 * @param endpoints - Endpoints parameter.
 * @example
 * toStepFunctionEndpoints(endpoints)
 * @returns Output value.
 */
export function toStepFunctionEndpoints(
  endpoints: ReadonlyArray<EndpointRuntimeDefinition>,
): Record<string, StepFunctionEndpointConfig> {
  const sortedEndpoints = endpoints
    .filter((endpoint) => endpoint.execution?.kind === "step-function")
    .sort((left, right) => left.routeId.localeCompare(right.routeId));

  return Object.fromEntries(
    sortedEndpoints.map((endpoint) => {
      const execution = endpoint.execution;
      if (!execution || execution.kind !== "step-function") {
        throw new Error(`Expected step-function execution for route ${endpoint.routeId}`);
      }

      const deployableDefinition = toDeployableStepFunctionDefinitionJson(execution.definitionJson);
      return [
        endpoint.routeId,
        {
          definition: deployableDefinition,
          integration_subtype: toIntegrationSubtype(execution.invocationType),
          invocation_type: execution.invocationType,
          lambda_resource_arns: toStepFunctionLambdaResourceArns(deployableDefinition),
          method: endpoint.method,
          path: endpoint.path,
          start_action: toStartAction(execution.invocationType),
          state_machine_name: execution.stateMachineName,
          workflow_type: execution.workflowType,
        },
      ];
    }),
  );
}
