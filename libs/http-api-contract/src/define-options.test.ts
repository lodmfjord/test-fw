/**
 * @fileoverview Smoke tests for define-options.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./define-options";

describe("define-options", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
