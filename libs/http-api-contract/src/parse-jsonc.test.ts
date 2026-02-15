/**
 * @fileoverview Smoke tests for parse-jsonc.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./parse-jsonc";

describe("parse-jsonc", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
