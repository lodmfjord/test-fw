/**
 * @fileoverview Smoke tests for register-defined-endpoint.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./register-defined-endpoint";

describe("register-defined-endpoint", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
