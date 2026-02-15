/**
 * @fileoverview Smoke tests for render-lambda-runtime-source-context.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./render-lambda-runtime-source-context";

describe("render-lambda-runtime-source-context", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
