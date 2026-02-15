/**
 * @fileoverview Smoke tests for to-endpoint-sqs-context.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./to-endpoint-sqs-context";

describe("to-endpoint-sqs-context", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
