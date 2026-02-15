/**
 * @fileoverview Smoke tests for register-defined-sqs-listener.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./register-defined-sqs-listener";

describe("register-defined-sqs-listener", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
