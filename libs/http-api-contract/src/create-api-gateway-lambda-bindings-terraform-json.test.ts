/**
 * @fileoverview Smoke tests for create-api-gateway-lambda-bindings-terraform-json.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./create-api-gateway-lambda-bindings-terraform-json";

describe("create-api-gateway-lambda-bindings-terraform-json", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
