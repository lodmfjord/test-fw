/**
 * @fileoverview Implements to listener target.
 */
import {
  parseStepFunctionDefinition,
  toStepFunctionDefinitionJson,
} from "@babbstack/step-functions";
import type {
  SqsListenerStepFunctionTarget,
  SqsListenerTarget,
  SqsListenerTargetInput,
  SqsStepFunctionInvocationType,
  SqsStepFunctionWorkflowType,
} from "./listener-target-types";

/** Converts to workflow type. */
function toWorkflowType(
  value: SqsStepFunctionWorkflowType | undefined,
): SqsStepFunctionWorkflowType {
  return value ?? "EXPRESS";
}

/** Converts to invocation type. */
function toInvocationType(
  value: SqsStepFunctionInvocationType | undefined,
): SqsStepFunctionInvocationType {
  return value ?? "async";
}

/** Converts to step function target. */
function toStepFunctionTarget(
  target: SqsListenerTargetInput,
): SqsListenerStepFunctionTarget | undefined {
  if (target.kind !== "step-function") {
    return undefined;
  }

  const definition = parseStepFunctionDefinition(target.definition);
  const definitionJson = toStepFunctionDefinitionJson(definition);

  const stateMachineName = target.stateMachineName.trim();
  if (stateMachineName.length === 0) {
    throw new Error("target.stateMachineName is required for step-function listeners");
  }

  const workflowType = toWorkflowType(target.workflowType);
  const invocationType = toInvocationType(target.invocationType);
  if (workflowType === "STANDARD" && invocationType === "sync") {
    throw new Error("target.invocationType sync is not supported for STANDARD workflows");
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

/**
 * Converts to listener target.
 * @param target - Target parameter.
 * @example
 * toListenerTarget(target)
 * @returns Output value.
 */
export function toListenerTarget(target: SqsListenerTargetInput | undefined): SqsListenerTarget {
  if (!target || target.kind === "lambda") {
    return {
      kind: "lambda",
    };
  }

  const stepFunctionTarget = toStepFunctionTarget(target);
  if (stepFunctionTarget) {
    return stepFunctionTarget;
  }

  return {
    kind: "lambda",
  };
}
