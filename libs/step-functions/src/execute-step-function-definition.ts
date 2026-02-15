/** @fileoverview Implements execute step function definition. @module libs/step-functions/src/execute-step-function-definition */
import type {
  ExecuteStepFunctionDefinitionOptions,
  StepFunctionDefinitionInput,
  StepFunctionExecutionResult,
} from "./asl-types";
import { parseStepFunctionDefinition } from "./parse-step-function-definition";
import { stepFunctionExecutionUtils } from "./step-function-execution-utils";

/** Handles execute step function definition. @example `await executeStepFunctionDefinition(input)` */
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
      const selectedInput = stepFunctionExecutionUtils.applyInputOrOutputPath(
        currentValue,
        state.InputPath,
      );
      const result = state.Result === undefined ? selectedInput : state.Result;
      const merged = stepFunctionExecutionUtils.applyResultPath(
        selectedInput,
        result,
        state.ResultPath,
      );
      const output = stepFunctionExecutionUtils.applyInputOrOutputPath(merged, state.OutputPath);
      const nextState = stepFunctionExecutionUtils.toNextStateName(stateName, state);
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
      const selectedInput = stepFunctionExecutionUtils.applyInputOrOutputPath(
        currentValue,
        state.InputPath,
      );
      const taskResult = await stepFunctionExecutionUtils.toTaskOutput(
        stateName,
        state,
        selectedInput,
        options,
      );
      const merged = stepFunctionExecutionUtils.applyResultPath(
        selectedInput,
        taskResult,
        state.ResultPath,
      );
      const output = stepFunctionExecutionUtils.applyInputOrOutputPath(merged, state.OutputPath);
      const nextState = stepFunctionExecutionUtils.toNextStateNameFromTask(stateName, state);
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
      stateName = stepFunctionExecutionUtils.toChoiceNextState(stateName, state, currentValue);
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
