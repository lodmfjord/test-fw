/**
 * @fileoverview Smoke tests for to-lambda-functions.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./to-lambda-functions";

describe("to-lambda-functions", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
