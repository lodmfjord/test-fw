/**
 * @fileoverview Smoke tests for write-lambda-js-files-export.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./write-lambda-js-files-export";

describe("write-lambda-js-files-export", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
