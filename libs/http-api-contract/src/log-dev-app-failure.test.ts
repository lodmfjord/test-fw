/**
 * @fileoverview Smoke tests for log-dev-app-failure.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./log-dev-app-failure";

describe("log-dev-app-failure", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
