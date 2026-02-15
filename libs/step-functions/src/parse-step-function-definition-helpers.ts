/**
 * @fileoverview Implements parse step function definition helpers.
 */
import { parseStepFunctionStateBuilders } from "./parse-step-function-state-builders";
import type { StepFunctionDefinition, StepFunctionDefinitionInput } from "./asl-types";

/** Converts values to state record. */
function toStateRecord(states: unknown): Record<string, StepFunctionDefinition["States"][string]> {
  if (!states || typeof states !== "object" || Array.isArray(states)) {
    throw new Error("Step-function definition States is required");
  }

  const entries = Object.entries(states);
  if (entries.length === 0) {
    throw new Error("Step-function definition States is required");
  }

  return Object.fromEntries(
    entries.map(([stateName, state]) => {
      const type = (state as { Type?: unknown })?.Type;
      if (type === "Pass") {
        return [stateName, parseStepFunctionStateBuilders.toPassState(stateName, state)];
      }
      if (type === "Task") {
        return [stateName, parseStepFunctionStateBuilders.toTaskState(stateName, state)];
      }
      if (type === "Choice") {
        return [stateName, parseStepFunctionStateBuilders.toChoiceState(stateName, state)];
      }
      if (type === "Succeed") {
        return [stateName, parseStepFunctionStateBuilders.toSucceedState(stateName, state)];
      }

      throw new Error(`Unsupported step-function state type: ${String(type)}`);
    }),
  );
}

/** Handles validate transitions. */
function validateTransitions(
  startAt: string,
  states: Record<string, StepFunctionDefinition["States"][string]>,
): void {
  if (!states[startAt]) {
    throw new Error(`Step-function StartAt state "${startAt}" was not found in States`);
  }

  for (const [stateName, state] of Object.entries(states)) {
    if ((state.Type === "Pass" || state.Type === "Task") && state.Next && !states[state.Next]) {
      throw new Error(
        `Step-function state "${stateName}" points to missing Next state "${state.Next}"`,
      );
    }

    if (state.Type !== "Choice") {
      continue;
    }

    for (const choice of state.Choices) {
      if (!states[choice.Next]) {
        throw new Error(
          `Step-function state "${stateName}" points to missing Next state "${choice.Next}"`,
        );
      }
    }

    if (state.Default && !states[state.Default]) {
      throw new Error(
        `Step-function state "${stateName}" points to missing Default state "${state.Default}"`,
      );
    }
  }
}

/** Converts values to definition source. */
function toDefinitionSource(definition: StepFunctionDefinitionInput): StepFunctionDefinition {
  if (typeof definition !== "string") {
    return definition;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(definition) as unknown;
  } catch {
    throw new Error("Invalid step-function definition JSON");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid step-function definition");
  }

  return parsed as StepFunctionDefinition;
}

export const parseStepFunctionDefinitionHelpers = {
  toDefinitionSource,
  toStateRecord,
  validateTransitions,
};
