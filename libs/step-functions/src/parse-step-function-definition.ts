import type { StepFunctionDefinition, StepFunctionDefinitionInput } from "./asl-types";
import { parseStepFunctionDefinitionHelpers } from "./parse-step-function-definition-helpers";

export function parseStepFunctionDefinition(
  definition: StepFunctionDefinitionInput,
): StepFunctionDefinition {
  const source = parseStepFunctionDefinitionHelpers.toDefinitionSource(definition);
  const startAt = source.StartAt?.trim();
  if (!startAt) {
    throw new Error("Step-function definition StartAt is required");
  }

  const states = parseStepFunctionDefinitionHelpers.toStateRecord(source.States);
  parseStepFunctionDefinitionHelpers.validateTransitions(startAt, states);

  return {
    ...(source.Comment ? { Comment: source.Comment } : {}),
    StartAt: startAt,
    States: states,
  };
}
