/**
 * @fileoverview Smoke tests for write-lambda-function-artifacts.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./write-lambda-function-artifacts";

describe("write-lambda-function-artifacts", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
