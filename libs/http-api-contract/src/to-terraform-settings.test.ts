/**
 * @fileoverview Smoke tests for to-terraform-settings.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./to-terraform-settings";

describe("to-terraform-settings", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
