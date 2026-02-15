/**
 * @fileoverview Tests getRegisteredStepFunctionTaskHandler behavior.
 */
import { describe, expect, it } from "bun:test";
import { getRegisteredStepFunctionTaskHandler } from "./get-registered-step-function-task-handler";
import { registerStepFunctionTaskHandler } from "./register-step-function-task-handler";
import { stepFunctionTaskHandlerMap } from "./step-function-task-handler-map";

describe("getRegisteredStepFunctionTaskHandler", () => {
  it("returns undefined when no handler is registered", () => {
    stepFunctionTaskHandlerMap.clear();
    expect(getRegisteredStepFunctionTaskHandler("missing")).toBeUndefined();
  });

  it("returns a previously registered handler", () => {
    stepFunctionTaskHandlerMap.clear();
    registerStepFunctionTaskHandler("task:demo", async () => ({ output: { ok: true } }));

    expect(typeof getRegisteredStepFunctionTaskHandler("task:demo")).toBe("function");
  });
});
