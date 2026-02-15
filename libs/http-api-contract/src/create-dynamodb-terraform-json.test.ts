/**
 * @fileoverview Smoke tests for create-dynamodb-terraform-json.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./create-dynamodb-terraform-json";

describe("create-dynamodb-terraform-json", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
