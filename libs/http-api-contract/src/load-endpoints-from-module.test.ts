/**
 * @fileoverview Smoke tests for load-endpoints-from-module.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./load-endpoints-from-module";

describe("load-endpoints-from-module", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
