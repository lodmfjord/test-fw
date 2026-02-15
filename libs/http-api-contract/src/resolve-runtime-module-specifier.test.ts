/**
 * @fileoverview Smoke tests for resolve-runtime-module-specifier.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./resolve-runtime-module-specifier";

describe("resolve-runtime-module-specifier", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
