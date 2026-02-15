/** @fileoverview Implements create step functions terraform json. @module libs/http-api-contract/src/create-step-functions-terraform-json */
import type { SqsListenerRuntimeDefinition } from "@babbstack/sqs";
import { createStepFunctionsTerraformJsonHelpers } from "./create-step-functions-terraform-json-helpers";
import type { EndpointRuntimeDefinition } from "./types";
import { toStepFunctionEndpoints } from "./to-step-function-endpoints";
import { toStepFunctionSqsListeners } from "./to-step-function-sqs-listeners";

type TerraformJson = Record<string, unknown>;

/** Creates step functions terraform json. @example `createStepFunctionsTerraformJson(input)` */
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
  const collections = createStepFunctionsTerraformJsonHelpers.createCollections();

  if (hasEndpointStateMachines) {
    createStepFunctionsTerraformJsonHelpers.appendEndpointStateMachineResources(collections);
  }

  if (hasSqsListenerStateMachines) {
    createStepFunctionsTerraformJsonHelpers.appendSqsListenerStateMachineResources(
      collections,
      usesManagedSqsQueues,
    );
  }

  if (includeApiGatewayResources && hasEndpointStateMachines) {
    createStepFunctionsTerraformJsonHelpers.appendApiGatewayResources(collections);
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
    resource: createStepFunctionsTerraformJsonHelpers.toResourceBlock(collections),
    variable: createStepFunctionsTerraformJsonHelpers.toVariableBlock(),
  };
}
