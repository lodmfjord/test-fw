/** @fileoverview Implements to route execution. @module libs/http-api-contract/src/to-route-execution */
import {
  parseStepFunctionDefinition,
  toStepFunctionDefinitionJson,
} from "@babbstack/step-functions";
import type {
  RouteExecution,
  RouteExecutionInput,
  RouteStepFunctionExecution,
  StepFunctionInvocationType,
  StepFunctionWorkflowType,
} from "./route-execution-types";

/** Converts values to workflow type. */
function toWorkflowType(value: StepFunctionWorkflowType | undefined): StepFunctionWorkflowType {
  return value ?? "EXPRESS";
}

/** Converts values to invocation type. */
function toInvocationType(
  value: StepFunctionInvocationType | undefined,
): StepFunctionInvocationType {
  return value ?? "sync";
}

/** Converts values to step function execution. */
function toStepFunctionExecution(
  input: RouteExecutionInput,
): RouteStepFunctionExecution | undefined {
  if (input.kind !== "step-function") {
    return undefined;
  }

  const definition = parseStepFunctionDefinition(input.definition);
  const definitionJson = toStepFunctionDefinitionJson(definition);

  const stateMachineName = input.stateMachineName.trim();
  if (stateMachineName.length === 0) {
    throw new Error("execution.stateMachineName is required for step-function routes");
  }

  const workflowType = toWorkflowType(input.workflowType);
  const invocationType = toInvocationType(input.invocationType);
  if (workflowType === "STANDARD" && invocationType === "sync") {
    throw new Error("execution.invocationType sync is not supported for STANDARD workflows");
  }

  return {
    definition,
    definitionJson,
    invocationType,
    kind: "step-function",
    stateMachineName,
    workflowType,
  };
}

/** Converts values to route execution. @example `toRouteExecution(input)` */
export function toRouteExecution(input: RouteExecutionInput | undefined): RouteExecution {
  if (!input || input.kind === "lambda") {
    return {
      kind: "lambda",
    };
  }

  const stepFunctionExecution = toStepFunctionExecution(input);
  if (stepFunctionExecution) {
    return stepFunctionExecution;
  }

  return {
    kind: "lambda",
  };
}
