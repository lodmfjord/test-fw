/**
 * @fileoverview Smoke tests for to-request-correlation-id.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./to-request-correlation-id";

describe("to-request-correlation-id", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
