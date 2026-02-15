/** @fileoverview Implements to step function definition json. @module libs/step-functions/src/to-step-function-definition-json */
import type { StepFunctionDefinition } from "./asl-types";

/** Converts values to step function definition json. @example `toStepFunctionDefinitionJson(input)` */
export function toStepFunctionDefinitionJson(definition: StepFunctionDefinition): string {
  return JSON.stringify(definition);
}
