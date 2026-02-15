/**
 * @fileoverview Smoke tests for collect-lambda-external-modules-by-route.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./collect-lambda-external-modules-by-route";

describe("collect-lambda-external-modules-by-route", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
