import type { StepFunctionTaskHandler } from "./asl-types";
import { stepFunctionTaskHandlerMap } from "./step-function-task-handler-map";

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
