/**
 * @fileoverview Tests toStepFunctionDefinitionJson behavior.
 */
import { describe, expect, it } from "bun:test";
import { toStepFunctionDefinitionJson } from "./to-step-function-definition-json";

describe("toStepFunctionDefinitionJson", () => {
  it("serializes step function definitions to JSON", () => {
    const json = toStepFunctionDefinitionJson({
      StartAt: "Done",
      States: {
        Done: {
          Type: "Succeed",
        },
      },
    });

    expect(JSON.parse(json)).toEqual({
      StartAt: "Done",
      States: {
        Done: {
          Type: "Succeed",
        },
      },
    });
  });
});
