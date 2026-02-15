/**
 * @fileoverview Smoke tests for render-lambda-observability-source.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./render-lambda-observability-source";

describe("render-lambda-observability-source", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
