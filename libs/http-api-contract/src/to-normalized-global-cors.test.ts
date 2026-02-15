/**
 * @fileoverview Smoke tests for to-normalized-global-cors.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./to-normalized-global-cors";

describe("to-normalized-global-cors", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
