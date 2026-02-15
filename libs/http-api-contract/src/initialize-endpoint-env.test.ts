/**
 * @fileoverview Smoke tests for initialize-endpoint-env.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./initialize-endpoint-env";

describe("initialize-endpoint-env", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
