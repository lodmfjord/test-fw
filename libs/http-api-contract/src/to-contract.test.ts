/**
 * @fileoverview Smoke tests for to-contract.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./to-contract";

describe("to-contract", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
