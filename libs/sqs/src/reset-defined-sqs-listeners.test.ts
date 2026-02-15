/**
 * @fileoverview Smoke tests for reset-defined-sqs-listeners.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./reset-defined-sqs-listeners";

describe("reset-defined-sqs-listeners", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
