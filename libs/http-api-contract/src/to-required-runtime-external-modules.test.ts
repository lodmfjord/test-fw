/**
 * @fileoverview Smoke tests for to-required-runtime-external-modules.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./to-required-runtime-external-modules";

describe("to-required-runtime-external-modules", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
