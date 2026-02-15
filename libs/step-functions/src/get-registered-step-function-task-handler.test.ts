/**
 * @fileoverview Smoke tests for get-registered-step-function-task-handler.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./get-registered-step-function-task-handler";

describe("get-registered-step-function-task-handler", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
