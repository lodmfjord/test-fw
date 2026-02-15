/**
 * @fileoverview Smoke tests for to-runtime-endpoints-with-global-cors-options.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./to-runtime-endpoints-with-global-cors-options";

describe("to-runtime-endpoints-with-global-cors-options", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
