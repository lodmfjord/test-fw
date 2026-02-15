/**
 * @fileoverview Smoke tests for to-routes-with-global-cors-options.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./to-routes-with-global-cors-options";

describe("to-routes-with-global-cors-options", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
