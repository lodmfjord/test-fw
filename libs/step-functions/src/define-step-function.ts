/** @fileoverview Implements define step function. @module libs/step-functions/src/define-step-function */
import type {
  StepFunctionDefinition,
  StepFunctionDefinitionShape,
  StepFunctionState,
  StepFunctionStateInput,
} from "./asl-types";

/** @example `defineStepFunction(input)` */ export function defineStepFunction<
  const TStates extends Record<string, StepFunctionStateInput>,
>(definition: StepFunctionDefinitionShape<TStates>): StepFunctionDefinition {
  return {
    ...(definition.Comment ? { Comment: definition.Comment } : {}),
    StartAt: definition.StartAt,
    States: Object.fromEntries(
      Object.entries(definition.States).map(([stateName, state]) => [
        stateName,
        {
          ...state,
        } as StepFunctionState,
      ]),
    ),
  };
}
