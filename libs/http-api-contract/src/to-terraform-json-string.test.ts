/**
 * @fileoverview Smoke tests for to-terraform-json-string.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./to-terraform-json-string";

describe("to-terraform-json-string", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
