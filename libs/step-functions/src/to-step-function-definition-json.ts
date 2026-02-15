/**
 * @fileoverview Implements to step function definition json.
 */
import type { StepFunctionDefinition } from "./asl-types";

/**
 * Converts values to step function definition json.
 * @param definition - Definition parameter.
 * @example
 * toStepFunctionDefinitionJson(definition)
 */
export function toStepFunctionDefinitionJson(definition: StepFunctionDefinition): string {
  return JSON.stringify(definition);
}
