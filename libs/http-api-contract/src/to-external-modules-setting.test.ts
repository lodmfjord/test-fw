/**
 * @fileoverview Smoke tests for to-external-modules-setting.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./to-external-modules-setting";

describe("to-external-modules-setting", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
