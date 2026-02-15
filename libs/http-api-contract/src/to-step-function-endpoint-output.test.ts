/**
 * @fileoverview Smoke tests for to-step-function-endpoint-output.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./to-step-function-endpoint-output";

describe("to-step-function-endpoint-output", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
