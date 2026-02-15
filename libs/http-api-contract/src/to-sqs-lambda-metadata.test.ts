/**
 * @fileoverview Smoke tests for to-sqs-lambda-metadata.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./to-sqs-lambda-metadata";

describe("to-sqs-lambda-metadata", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
