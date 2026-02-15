/**
 * @fileoverview Smoke tests for define-step-function.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./define-step-function";

describe("define-step-function", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
