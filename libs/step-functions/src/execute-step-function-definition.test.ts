/**
 * @fileoverview Tests execute step function definition.
 */
import { describe, expect, it } from "bun:test";
import { executeStepFunctionDefinition } from "./execute-step-function-definition";
import { defineStepFunction } from "./define-step-function";
import { registerStepFunctionTaskHandler } from "./register-step-function-task-handler";

describe("executeStepFunctionDefinition", () => {
  it("executes a hello world pass state", async () => {
    const definition = defineStepFunction({
      StartAt: "Hello",
      States: {
        Hello: {
          Type: "Pass",
          Result: {
            message: "hello-world",
          },
          End: true,
        },
      },
    });

    const result = await executeStepFunctionDefinition(definition, {
      ignored: true,
    });

    expect(result.status).toBe("SUCCEEDED");
    expect(result.output).toEqual({
      message: "hello-world",
    });
  });

  it("merges pass Result into input with ResultPath", async () => {
    const definition = defineStepFunction({
      StartAt: "Merge",
      States: {
        Merge: {
          Type: "Pass",
          Result: {
            ok: true,
          },
          ResultPath: "$.step",
          End: true,
        },
      },
    });

    const result = await executeStepFunctionDefinition(definition, {
      id: "123",
    });

    expect(result.output).toEqual({
      id: "123",
      step: {
        ok: true,
      },
    });
  });

  it("discards pass Result when ResultPath is null", async () => {
    const definition = defineStepFunction({
      StartAt: "Discard",
      States: {
        Discard: {
          Type: "Pass",
          Result: {
            shouldNotAppear: true,
          },
          ResultPath: null,
          End: true,
        },
      },
    });

    const result = await executeStepFunctionDefinition(definition, {
      keep: true,
    });

    expect(result.output).toEqual({
      keep: true,
    });
  });

  it("applies InputPath, ResultPath, and OutputPath", async () => {
    const definition = defineStepFunction({
      StartAt: "Transform",
      States: {
        Transform: {
          Type: "Pass",
          InputPath: "$.payload",
          Result: {
            status: "done",
          },
          ResultPath: "$.result",
          OutputPath: "$.result",
          End: true,
        },
      },
    });

    const result = await executeStepFunctionDefinition(definition, {
      payload: {
        userId: "u-1",
      },
      ignored: true,
    });

    expect(result.output).toEqual({
      status: "done",
    });
  });

  it("runs a real branching flow with task lambdas and choice state", async () => {
    const definition = defineStepFunction({
      StartAt: "GenerateRandom",
      States: {
        GenerateRandom: {
          Type: "Task",
          Resource: "lambda:generate-random-number",
          ResultPath: "$.random",
          Next: "BranchOnRandom",
        },
        BranchOnRandom: {
          Type: "Choice",
          Choices: [
            {
              Variable: "$.random",
              NumericLessThan: 51,
              Next: "HandleLowNumber",
            },
            {
              Variable: "$.random",
              NumericGreaterThan: 50,
              Next: "HandleHighNumber",
            },
          ],
        },
        HandleLowNumber: {
          Type: "Task",
          Resource: "lambda:handle-low-number",
          End: true,
        },
        HandleHighNumber: {
          Type: "Task",
          Resource: "lambda:handle-high-number",
          End: true,
        },
      },
    });

    const result = await executeStepFunctionDefinition(
      definition,
      {},
      {
        taskHandlers: {
          "lambda:generate-random-number": () => 27,
          "lambda:handle-high-number": () => ({
            branch: "high",
            message: "Number is greater than 50",
          }),
          "lambda:handle-low-number": () => ({
            branch: "low",
            message: "Number is less than 51",
          }),
        },
      },
    );

    expect(result.output).toEqual({
      branch: "low",
      message: "Number is less than 51",
    });
  });

  it("uses registered task handlers when options are not provided", async () => {
    registerStepFunctionTaskHandler("local:test-registered-task", () => ({
      ok: true,
    }));

    const definition = defineStepFunction({
      StartAt: "RunTask",
      States: {
        RunTask: {
          Type: "Task",
          Resource: "local:test-registered-task",
          End: true,
        },
      },
    });

    const result = await executeStepFunctionDefinition(definition, {
      ignored: true,
    });

    expect(result.output).toEqual({
      ok: true,
    });
  });
});
