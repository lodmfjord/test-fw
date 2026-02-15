/**
 * @fileoverview Builds generated runtime source blocks for step-function endpoints.
 */
import type { EndpointRuntimeDefinition } from "./types";

type StepFunctionRuntimeRendering = {
  handlerSource: string;
  importUsageSource: string;
  supportSource: string;
};

type TaskHandlerEntry = {
  handlerSource: string;
  resource: string;
};

/** Converts to task-handler entries. */
function toTaskHandlerEntries(endpoint: EndpointRuntimeDefinition): TaskHandlerEntry[] {
  const execution = endpoint.execution;
  if (!execution || execution.kind !== "step-function") {
    return [];
  }

  const entriesByResource = new Map<string, string>();
  for (const state of Object.values(execution.definition.States)) {
    if (!state || typeof state !== "object") {
      continue;
    }

    const parsedState = state as {
      Resource?: unknown;
      Type?: unknown;
      handler?: unknown;
    };
    if (parsedState.Type !== "Task") {
      continue;
    }

    if (typeof parsedState.Resource !== "string" || typeof parsedState.handler !== "function") {
      continue;
    }

    if (!entriesByResource.has(parsedState.Resource)) {
      entriesByResource.set(parsedState.Resource, parsedState.handler.toString());
    }
  }

  return [...entriesByResource.entries()]
    .map(([resource, handlerSource]) => ({ handlerSource, resource }))
    .sort((left, right) => left.resource.localeCompare(right.resource));
}

/**
 * Converts to step-function runtime rendering.
 * @param endpoint - Endpoint parameter.
 * @example
 * toStepFunctionRuntimeRendering(endpoint)
 * @returns Output value.
 */
export function toStepFunctionRuntimeRendering(
  endpoint: EndpointRuntimeDefinition,
): StepFunctionRuntimeRendering | undefined {
  const execution = endpoint.execution;
  if (!execution || execution.kind !== "step-function") {
    return undefined;
  }

  const taskHandlers = toTaskHandlerEntries(endpoint);
  const taskHandlersSource =
    taskHandlers.length === 0
      ? "{}"
      : `{
${taskHandlers.map(({ handlerSource, resource }) => `  ${JSON.stringify(resource)}: ${handlerSource},`).join("\n")}
}`;

  return {
    handlerSource: "runStepFunctionEndpoint",
    importUsageSource: taskHandlers.map((item) => item.handlerSource).join("\n"),
    supportSource: `const endpointStepFunctionInvocationType = ${JSON.stringify(execution.invocationType)};
const endpointStepFunctionDefinition = ${execution.definitionJson};
const endpointStepFunctionTaskHandlers = ${taskHandlersSource};
/** Runs step-function endpoint locally inside the generated lambda runtime. */
async function runStepFunctionEndpoint({ body, headers, params, query }) {
  const stepFunctionInput = {
    body,
    headers,
    method: endpointMethod,
    params,
    path: endpointPath,
    query,
    routeId: endpointRouteId
  };

  if (endpointStepFunctionInvocationType === "async") {
    return {
      statusCode: endpointSuccessStatusCode,
      value: {
        executionArn: \`arn:aws:states:local:000000000000:execution:\${endpointRouteId}:\${Date.now()}\`,
        status: "RUNNING"
      }
    };
  }

  const stepFunctionResult = await simpleApiExecuteStepFunctionDefinition(
    endpointStepFunctionDefinition,
    stepFunctionInput,
    { taskHandlers: endpointStepFunctionTaskHandlers }
  );
  return {
    value: stepFunctionResult.output
  };
}`,
  };
}
