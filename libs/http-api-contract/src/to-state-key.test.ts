/**
 * @fileoverview Smoke tests for to-state-key.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./to-state-key";

describe("to-state-key", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
