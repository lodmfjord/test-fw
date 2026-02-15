/**
 * @fileoverview Smoke tests for to-step-function-endpoints.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./to-step-function-endpoints";

describe("to-step-function-endpoints", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
