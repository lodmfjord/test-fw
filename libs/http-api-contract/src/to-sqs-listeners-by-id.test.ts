/**
 * @fileoverview Smoke tests for to-sqs-listeners-by-id.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./to-sqs-listeners-by-id";

describe("to-sqs-listeners-by-id", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
