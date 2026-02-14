import type { StepFunctionDefinition } from "./asl-types";

export function toStepFunctionDefinitionJson(definition: StepFunctionDefinition): string {
  return JSON.stringify(definition);
}
