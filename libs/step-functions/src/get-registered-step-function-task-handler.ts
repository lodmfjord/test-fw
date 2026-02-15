/**
 * @fileoverview Implements get registered step function task handler.
 */
import type { StepFunctionTaskHandler } from "./asl-types";
import { stepFunctionTaskHandlerMap } from "./step-function-task-handler-map";

/**
 * Gets registered step function task handler.
 * @param resource - Resource parameter.
 * @example
 * getRegisteredStepFunctionTaskHandler(resource)
 */
export function getRegisteredStepFunctionTaskHandler(
  resource: string,
): StepFunctionTaskHandler | undefined {
  return stepFunctionTaskHandlerMap.get(resource);
}
