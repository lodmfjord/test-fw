import { describe, expect, it } from "bun:test";
import { defineStepFunction } from "./define-step-function";
import { parseStepFunctionDefinition } from "./parse-step-function-definition";

describe("parseStepFunctionDefinition", () => {
  it("accepts typed definitions", () => {
    const typed = defineStepFunction({
      StartAt: "Done",
      States: {
        Done: {
          Type: "Succeed",
        },
      },
    });

    const parsed = parseStepFunctionDefinition(typed);
    expect(parsed.StartAt).toBe("Done");
    expect(parsed.States.Done).toEqual({
      Type: "Succeed",
    });
  });

  it("accepts JSON definition strings", () => {
    const parsed = parseStepFunctionDefinition(
      '{"StartAt":"Done","States":{"Done":{"Type":"Succeed"}}}',
    );

    expect(parsed.StartAt).toBe("Done");
    expect(parsed.States.Done).toEqual({
      Type: "Succeed",
    });
  });

  it("accepts task and choice states", () => {
    const parsed = parseStepFunctionDefinition({
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
              Next: "Low",
            },
            {
              Variable: "$.random",
              NumericGreaterThan: 50,
              Next: "High",
            },
          ],
        },
        Low: {
          Type: "Succeed",
        },
        High: {
          Type: "Succeed",
        },
      },
    });

    const generateRandomState = parsed.States.GenerateRandom;
    const branchOnRandomState = parsed.States.BranchOnRandom;
    expect(generateRandomState?.Type).toBe("Task");
    expect(branchOnRandomState?.Type).toBe("Choice");
  });

  it("rejects missing StartAt state", () => {
    expect(() =>
      parseStepFunctionDefinition({
        StartAt: "Missing",
        States: {
          Done: {
            Type: "Succeed",
          },
        },
      }),
    ).toThrow('Step-function StartAt state "Missing" was not found in States');
  });

  it("rejects Next transition to missing state", () => {
    expect(() =>
      parseStepFunctionDefinition({
        StartAt: "First",
        States: {
          First: {
            Type: "Pass",
            Next: "Missing",
          },
        },
      }),
    ).toThrow('Step-function state "First" points to missing Next state "Missing"');
  });

  it("rejects invalid path values", () => {
    expect(() =>
      parseStepFunctionDefinition(
        '{"StartAt":"First","States":{"First":{"Type":"Pass","InputPath":"input","End":true}}}',
      ),
    ).toThrow('Step-function state "First" has invalid InputPath "input"');
  });
});
