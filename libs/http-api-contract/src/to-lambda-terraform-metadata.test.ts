/**
 * @fileoverview Smoke tests for to-lambda-terraform-metadata.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./to-lambda-terraform-metadata";

describe("to-lambda-terraform-metadata", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
