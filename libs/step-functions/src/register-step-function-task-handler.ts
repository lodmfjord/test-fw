/**
 * @fileoverview Implements register step function task handler.
 */
import type { StepFunctionTaskHandler } from "./asl-types";
import { stepFunctionTaskHandlerMap } from "./step-function-task-handler-map";

/**
 * Registers step function task handler.
 * @param resource - Resource parameter.
 * @param handler - Handler parameter.
 * @example
 * registerStepFunctionTaskHandler(resource, handler)
 * @throws Error when operation fails.
 */
export function registerStepFunctionTaskHandler(
  resource: string,
  handler: StepFunctionTaskHandler,
): void {
  const key = resource.trim();
  if (key.length === 0) {
    throw new Error("step-function task resource is required");
  }

  stepFunctionTaskHandlerMap.set(key, handler);
}
