import type {
  ExecuteStepFunctionDefinitionOptions,
  StepFunctionChoiceRule,
  StepFunctionDefinitionInput,
  StepFunctionExecutionResult,
  StepFunctionJsonPath,
  StepFunctionJsonPathOrNull,
  StepFunctionPassState,
  StepFunctionTaskState,
} from "./asl-types";
import { getRegisteredStepFunctionTaskHandler } from "./get-registered-step-function-task-handler";
import { parseStepFunctionDefinition } from "./parse-step-function-definition";

function cloneValue<TValue>(value: TValue): TValue {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as TValue;
}

function toPathSegments(path: StepFunctionJsonPath): string[] {
  if (path === "$") {
    return [];
  }

  return path
    .slice(2)
    .split(".")
    .filter((segment) => segment.length > 0);
}

function readPath(value: unknown, path: StepFunctionJsonPath): unknown {
  const segments = toPathSegments(path);
  let currentValue: unknown = value;
  for (const segment of segments) {
    if (!currentValue || typeof currentValue !== "object") {
      return undefined;
    }

    currentValue = (currentValue as Record<string, unknown>)[segment];
  }

  return currentValue;
}

function applyInputOrOutputPath(
  value: unknown,
  path: StepFunctionJsonPathOrNull | undefined,
): unknown {
  if (path === undefined) {
    return value;
  }

  if (path === null) {
    return {};
  }

  return readPath(value, path);
}

function writePath(value: unknown, path: StepFunctionJsonPath, result: unknown): unknown {
  if (path === "$") {
    return result;
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Cannot apply ResultPath ${path} to non-object input`);
  }

  const segments = toPathSegments(path);
  const output = cloneValue(value) as Record<string, unknown>;
  let cursor: Record<string, unknown> = output;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (!segment) {
      continue;
    }

    const isLast = index === segments.length - 1;
    if (isLast) {
      cursor[segment] = result;
      return output;
    }

    const nextValue = cursor[segment];
    if (!nextValue || typeof nextValue !== "object" || Array.isArray(nextValue)) {
      cursor[segment] = {};
    }

    cursor = cursor[segment] as Record<string, unknown>;
  }

  return output;
}

function applyResultPath(
  input: unknown,
  result: unknown,
  resultPath: StepFunctionPassState["ResultPath"],
): unknown {
  if (resultPath === null) {
    return input;
  }

  return writePath(input, resultPath ?? "$", result);
}

function toNextStateName(stateName: string, state: StepFunctionPassState): string | undefined {
  if (state.End) {
    return undefined;
  }

  if (!state.Next) {
    throw new Error(`Step-function state "${stateName}" is missing Next or End`);
  }

  return state.Next;
}

function toNextStateNameFromTask(
  stateName: string,
  state: StepFunctionTaskState,
): string | undefined {
  if (state.End) {
    return undefined;
  }

  if (!state.Next) {
    throw new Error(`Step-function state "${stateName}" is missing Next or End`);
  }

  return state.Next;
}

function toChoiceMatches(rule: StepFunctionChoiceRule, input: unknown): boolean {
  const value = readPath(input, rule.Variable);
  if (typeof value !== "number" || Number.isNaN(value)) {
    return false;
  }

  if (rule.NumericGreaterThan !== undefined && !(value > rule.NumericGreaterThan)) {
    return false;
  }

  if (rule.NumericGreaterThanEquals !== undefined && !(value >= rule.NumericGreaterThanEquals)) {
    return false;
  }

  if (rule.NumericLessThan !== undefined && !(value < rule.NumericLessThan)) {
    return false;
  }

  if (rule.NumericLessThanEquals !== undefined && !(value <= rule.NumericLessThanEquals)) {
    return false;
  }

  return true;
}

function toChoiceNextState(
  stateName: string,
  state: { Choices: StepFunctionChoiceRule[]; Default?: string },
  input: unknown,
): string {
  for (const rule of state.Choices) {
    if (toChoiceMatches(rule, input)) {
      return rule.Next;
    }
  }

  if (state.Default) {
    return state.Default;
  }

  throw new Error(`Step-function Choice state "${stateName}" had no matching rule`);
}

async function toTaskOutput(
  stateName: string,
  state: StepFunctionTaskState,
  input: unknown,
  options: ExecuteStepFunctionDefinitionOptions,
): Promise<unknown> {
  if (state.handler) {
    return state.handler(input);
  }

  const handler = options.taskHandlers?.[state.Resource];
  const registeredHandler = getRegisteredStepFunctionTaskHandler(state.Resource);
  const resolvedHandler = handler ?? registeredHandler;
  if (!resolvedHandler) {
    throw new Error(
      `Step-function Task state "${stateName}" has no local handler for resource "${state.Resource}"`,
    );
  }

  return resolvedHandler(input);
}

export async function executeStepFunctionDefinition(
  definition: StepFunctionDefinitionInput,
  input: unknown,
  options: ExecuteStepFunctionDefinitionOptions = {},
): Promise<StepFunctionExecutionResult> {
  const document = parseStepFunctionDefinition(definition);
  let stateName = document.StartAt;
  let currentValue = input;

  for (let iteration = 0; iteration < 1_000; iteration += 1) {
    const state = document.States[stateName];
    if (!state) {
      throw new Error(`Step-function state "${stateName}" was not found`);
    }

    if (state.Type === "Pass") {
      const selectedInput = applyInputOrOutputPath(currentValue, state.InputPath);
      const result = state.Result === undefined ? selectedInput : state.Result;
      const merged = applyResultPath(selectedInput, result, state.ResultPath);
      const output = applyInputOrOutputPath(merged, state.OutputPath);
      const nextState = toNextStateName(stateName, state);
      if (!nextState) {
        return {
          output,
          status: "SUCCEEDED",
        };
      }

      stateName = nextState;
      currentValue = output;
      continue;
    }

    if (state.Type === "Task") {
      const selectedInput = applyInputOrOutputPath(currentValue, state.InputPath);
      const taskResult = await toTaskOutput(stateName, state, selectedInput, options);
      const merged = applyResultPath(selectedInput, taskResult, state.ResultPath);
      const output = applyInputOrOutputPath(merged, state.OutputPath);
      const nextState = toNextStateNameFromTask(stateName, state);
      if (!nextState) {
        return {
          output,
          status: "SUCCEEDED",
        };
      }

      stateName = nextState;
      currentValue = output;
      continue;
    }

    if (state.Type === "Choice") {
      stateName = toChoiceNextState(stateName, state, currentValue);
      continue;
    }

    if (state.Type === "Succeed") {
      return {
        output: currentValue,
        status: "SUCCEEDED",
      };
    }

    throw new Error(`Unsupported step-function state type: ${String(state)}`);
  }

  throw new Error("Step-function exceeded max local transitions");
}
