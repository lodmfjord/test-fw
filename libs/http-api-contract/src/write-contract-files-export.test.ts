/**
 * @fileoverview Smoke tests for write-contract-files-export.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./write-contract-files-export";

describe("write-contract-files-export", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
