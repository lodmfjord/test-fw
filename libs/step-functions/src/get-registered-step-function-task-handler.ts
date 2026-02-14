import type { StepFunctionTaskHandler } from "./asl-types";
import { stepFunctionTaskHandlerMap } from "./step-function-task-handler-map";

export function getRegisteredStepFunctionTaskHandler(
  resource: string,
): StepFunctionTaskHandler | undefined {
  return stepFunctionTaskHandlerMap.get(resource);
}
