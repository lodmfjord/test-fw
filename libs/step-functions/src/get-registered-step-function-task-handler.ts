/** @fileoverview Implements get registered step function task handler. @module libs/step-functions/src/get-registered-step-function-task-handler */
import type { StepFunctionTaskHandler } from "./asl-types";
import { stepFunctionTaskHandlerMap } from "./step-function-task-handler-map";

/** Gets registered step function task handler. @example `getRegisteredStepFunctionTaskHandler(input)` */
export function getRegisteredStepFunctionTaskHandler(
  resource: string,
): StepFunctionTaskHandler | undefined {
  return stepFunctionTaskHandlerMap.get(resource);
}
