/**
 * @fileoverview Smoke tests for to-endpoint-handler-output.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./to-endpoint-handler-output";

describe("to-endpoint-handler-output", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
