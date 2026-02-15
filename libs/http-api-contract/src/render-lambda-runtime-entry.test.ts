/**
 * @fileoverview Smoke tests for render-lambda-runtime-entry.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./render-lambda-runtime-entry";

describe("render-lambda-runtime-entry", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
