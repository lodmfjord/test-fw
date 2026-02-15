/**
 * @fileoverview Smoke tests for to-sqs-queues.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./to-sqs-queues";

describe("to-sqs-queues", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
