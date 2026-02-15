/**
 * @fileoverview Smoke tests for render-sqs-listener-lambda-source.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./render-sqs-listener-lambda-source";

describe("render-sqs-listener-lambda-source", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
