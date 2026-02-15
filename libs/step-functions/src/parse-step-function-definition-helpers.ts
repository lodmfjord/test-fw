/**
 * @fileoverview Implements parse step function definition helpers.
 */
import type {
  StepFunctionChoiceRule,
  StepFunctionChoiceState,
  StepFunctionDefinition,
  StepFunctionDefinitionInput,
  StepFunctionJsonPathOrNull,
  StepFunctionPassState,
  StepFunctionSucceedState,
  StepFunctionTaskState,
} from "./asl-types";

/** Converts values to path type label. */
function toPathTypeLabel(pathType: "InputPath" | "OutputPath" | "ResultPath"): string {
  return pathType;
}

/** Handles validate json path. */
function validateJsonPath(
  stateName: string,
  pathType: "InputPath" | "OutputPath" | "ResultPath",
  path: StepFunctionJsonPathOrNull | undefined,
): void {
  if (path === undefined || path === null) {
    return;
  }

  if (typeof path !== "string" || !path.startsWith("$")) {
    throw new Error(
      `Step-function state "${stateName}" has invalid ${toPathTypeLabel(pathType)} "${String(path)}"`,
    );
  }
}

/** Handles validate strict json path. */
function validateStrictJsonPath(stateName: string, pathType: "Variable", path: unknown): void {
  if (typeof path !== "string" || !path.startsWith("$")) {
    throw new Error(`Step-function state "${stateName}" has invalid ${pathType} "${String(path)}"`);
  }
}

/** Converts values to pass state. */
function toPassState(stateName: string, source: unknown): StepFunctionPassState {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new Error(`Step-function state "${stateName}" is invalid`);
  }

  const typed = source as StepFunctionPassState;
  const hasNext = typeof typed.Next === "string" && typed.Next.trim().length > 0;
  const hasEnd = typed.End === true;
  if (hasNext === hasEnd) {
    throw new Error(`Step-function state "${stateName}" must define exactly one of Next or End`);
  }

  validateJsonPath(stateName, "InputPath", typed.InputPath);
  validateJsonPath(stateName, "OutputPath", typed.OutputPath);
  validateJsonPath(stateName, "ResultPath", typed.ResultPath);

  return {
    ...(typed.Comment ? { Comment: typed.Comment } : {}),
    ...(typed.InputPath !== undefined ? { InputPath: typed.InputPath } : {}),
    ...(typed.OutputPath !== undefined ? { OutputPath: typed.OutputPath } : {}),
    ...(typed.Result !== undefined ? { Result: typed.Result } : {}),
    ...(typed.ResultPath !== undefined ? { ResultPath: typed.ResultPath } : {}),
    ...(hasNext ? { Next: typed.Next.trim() } : { End: true }),
    Type: "Pass",
  };
}

/** Converts values to task state. */
function toTaskState(stateName: string, source: unknown): StepFunctionTaskState {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new Error(`Step-function state "${stateName}" is invalid`);
  }

  const typed = source as StepFunctionTaskState;
  const hasNext = typeof typed.Next === "string" && typed.Next.trim().length > 0;
  const hasEnd = typed.End === true;
  if (hasNext === hasEnd) {
    throw new Error(`Step-function state "${stateName}" must define exactly one of Next or End`);
  }

  const resource = typed.Resource?.trim();
  if (!resource) {
    throw new Error(`Step-function state "${stateName}" Resource is required`);
  }

  if (typed.handler !== undefined && typeof typed.handler !== "function") {
    throw new Error(`Step-function state "${stateName}" handler must be a function`);
  }

  validateJsonPath(stateName, "InputPath", typed.InputPath);
  validateJsonPath(stateName, "OutputPath", typed.OutputPath);
  validateJsonPath(stateName, "ResultPath", typed.ResultPath);

  return {
    ...(typed.Comment ? { Comment: typed.Comment } : {}),
    ...(typed.InputPath !== undefined ? { InputPath: typed.InputPath } : {}),
    ...(typed.OutputPath !== undefined ? { OutputPath: typed.OutputPath } : {}),
    ...(typed.ResultPath !== undefined ? { ResultPath: typed.ResultPath } : {}),
    ...(typed.handler ? { handler: typed.handler } : {}),
    ...(hasNext ? { Next: typed.Next.trim() } : { End: true }),
    Resource: resource,
    Type: "Task",
  };
}

/** Converts values to choice rule. */
function toChoiceRule(stateName: string, source: unknown): StepFunctionChoiceRule {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new Error(`Step-function state "${stateName}" has invalid Choice rule`);
  }

  const typed = source as StepFunctionChoiceRule;
  const next = typed.Next?.trim();
  if (!next) {
    throw new Error(`Step-function state "${stateName}" has Choice rule missing Next`);
  }

  validateStrictJsonPath(stateName, "Variable", typed.Variable);

  const operators = [
    typed.NumericGreaterThan,
    typed.NumericGreaterThanEquals,
    typed.NumericLessThan,
    typed.NumericLessThanEquals,
  ];
  const definedOperators = operators.filter((value) => value !== undefined);
  if (definedOperators.length === 0) {
    throw new Error(`Step-function state "${stateName}" has Choice rule without numeric condition`);
  }

  for (const value of definedOperators) {
    if (typeof value !== "number" || Number.isNaN(value)) {
      throw new Error(
        `Step-function state "${stateName}" has Choice rule with invalid numeric value`,
      );
    }
  }

  return {
    ...(typed.NumericGreaterThan !== undefined
      ? { NumericGreaterThan: typed.NumericGreaterThan }
      : {}),
    ...(typed.NumericGreaterThanEquals !== undefined
      ? { NumericGreaterThanEquals: typed.NumericGreaterThanEquals }
      : {}),
    ...(typed.NumericLessThan !== undefined ? { NumericLessThan: typed.NumericLessThan } : {}),
    ...(typed.NumericLessThanEquals !== undefined
      ? { NumericLessThanEquals: typed.NumericLessThanEquals }
      : {}),
    Next: next,
    Variable: typed.Variable,
  };
}

/** Converts values to choice state. */
function toChoiceState(stateName: string, source: unknown): StepFunctionChoiceState {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new Error(`Step-function state "${stateName}" is invalid`);
  }

  const typed = source as StepFunctionChoiceState;
  if (!Array.isArray(typed.Choices) || typed.Choices.length === 0) {
    throw new Error(`Step-function state "${stateName}" Choices is required`);
  }

  const defaultState = typed.Default?.trim();
  if (typed.Default !== undefined && !defaultState) {
    throw new Error(`Step-function state "${stateName}" has invalid Default`);
  }

  return {
    ...(typed.Comment ? { Comment: typed.Comment } : {}),
    Choices: typed.Choices.map((choice) => toChoiceRule(stateName, choice)),
    ...(defaultState ? { Default: defaultState } : {}),
    Type: "Choice",
  };
}

/** Converts values to succeed state. */
function toSucceedState(stateName: string, source: unknown): StepFunctionSucceedState {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new Error(`Step-function state "${stateName}" is invalid`);
  }

  const typed = source as StepFunctionSucceedState;
  return {
    ...(typed.Comment ? { Comment: typed.Comment } : {}),
    Type: "Succeed",
  };
}

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
        return [stateName, toPassState(stateName, state)];
      }

      if (type === "Task") {
        return [stateName, toTaskState(stateName, state)];
      }

      if (type === "Choice") {
        return [stateName, toChoiceState(stateName, state)];
      }

      if (type === "Succeed") {
        return [stateName, toSucceedState(stateName, state)];
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
