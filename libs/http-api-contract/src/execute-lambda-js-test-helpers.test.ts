/**
 * @fileoverview Smoke tests for execute-lambda-js-test-helpers.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./execute-lambda-js-test-helpers";

describe("execute-lambda-js-test-helpers", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
