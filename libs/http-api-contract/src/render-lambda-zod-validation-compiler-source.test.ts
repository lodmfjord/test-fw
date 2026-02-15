/**
 * @fileoverview Smoke tests for render-lambda-zod-validation-compiler-source.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./render-lambda-zod-validation-compiler-source";

describe("render-lambda-zod-validation-compiler-source", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
