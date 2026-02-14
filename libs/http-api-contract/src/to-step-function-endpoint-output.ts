import { executeStepFunctionDefinition } from "./execute-step-function-definition";
import type { EndpointRuntimeDefinition } from "./types";
import type { EndpointHandlerOutput } from "./types";
import type { StepFunctionTaskHandler } from "@babbstack/step-functions";

type StepFunctionEndpointInput = {
  body: unknown;
  headers: unknown;
  method: string;
  params: unknown;
  path: string;
  query: unknown;
  routeId: string;
};

type StepFunctionEndpointExecutionOptions = {
  taskHandlers?: Record<string, StepFunctionTaskHandler>;
};

function toLocalExecutionArn(routeId: string): string {
  const timestamp = Date.now();
  return `arn:aws:states:local:000000000000:execution:${routeId}:${timestamp}`;
}

export async function toStepFunctionEndpointOutput(
  endpoint: EndpointRuntimeDefinition,
  input: StepFunctionEndpointInput,
  options: StepFunctionEndpointExecutionOptions = {},
): Promise<EndpointHandlerOutput<unknown>> {
  const execution = endpoint.execution;
  if (!execution || execution.kind !== "step-function") {
    throw new Error("Step-function execution is required");
  }

  const stepFunctionInput = {
    body: input.body,
    headers: input.headers,
    method: input.method,
    params: input.params,
    path: input.path,
    query: input.query,
    routeId: input.routeId,
  };

  if (execution.invocationType === "async") {
    return {
      statusCode: 202,
      value: {
        executionArn: toLocalExecutionArn(endpoint.routeId),
        status: "RUNNING",
      },
    };
  }

  const result = await executeStepFunctionDefinition(execution.definition, stepFunctionInput, {
    ...(options.taskHandlers ? { taskHandlers: options.taskHandlers } : {}),
  });
  return {
    value: result.output,
  };
}
