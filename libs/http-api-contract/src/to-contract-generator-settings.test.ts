/**
 * @fileoverview Smoke tests for to-contract-generator-settings.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./to-contract-generator-settings";

describe("to-contract-generator-settings", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
