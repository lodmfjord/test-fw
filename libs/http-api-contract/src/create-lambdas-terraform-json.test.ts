/**
 * @fileoverview Smoke tests for create-lambdas-terraform-json.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./create-lambdas-terraform-json";

describe("create-lambdas-terraform-json", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
