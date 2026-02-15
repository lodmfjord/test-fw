/**
 * @fileoverview Smoke tests for create-sqs-terraform-json.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./create-sqs-terraform-json";

describe("create-sqs-terraform-json", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
