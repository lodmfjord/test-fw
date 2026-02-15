/**
 * @fileoverview Smoke tests for write-terraform-files.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./write-terraform-files";

describe("write-terraform-files", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
