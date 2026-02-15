/**
 * @fileoverview Tests registerStepFunctionTaskHandler behavior.
 */
import { describe, expect, it } from "bun:test";
import { getRegisteredStepFunctionTaskHandler } from "./get-registered-step-function-task-handler";
import { registerStepFunctionTaskHandler } from "./register-step-function-task-handler";
import { stepFunctionTaskHandlerMap } from "./step-function-task-handler-map";

describe("registerStepFunctionTaskHandler", () => {
  it("registers task handlers by trimmed resource key", () => {
    stepFunctionTaskHandlerMap.clear();

    registerStepFunctionTaskHandler("  task:demo  ", async (input) => ({ output: input }));
    const handler = getRegisteredStepFunctionTaskHandler("task:demo");

    expect(typeof handler).toBe("function");
  });

  it("rejects empty resource values", () => {
    expect(() => registerStepFunctionTaskHandler("   ", async () => ({ output: {} }))).toThrow(
      "step-function task resource is required",
    );
  });
});
