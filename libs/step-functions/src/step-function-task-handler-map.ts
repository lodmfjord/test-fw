/** @fileoverview Implements step function task handler map. @module libs/step-functions/src/step-function-task-handler-map */
import type { StepFunctionTaskHandler } from "./asl-types";

export const stepFunctionTaskHandlerMap = new Map<string, StepFunctionTaskHandler>();
