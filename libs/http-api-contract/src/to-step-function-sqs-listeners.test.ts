/**
 * @fileoverview Smoke tests for to-step-function-sqs-listeners.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./to-step-function-sqs-listeners";

describe("to-step-function-sqs-listeners", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
