/**
 * @fileoverview Smoke tests for write-sqs-listener-js-files.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./write-sqs-listener-js-files";

describe("write-sqs-listener-js-files", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
