/**
 * @fileoverview Smoke tests for find-endpoint-runtime-definition.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./find-endpoint-runtime-definition";

describe("find-endpoint-runtime-definition", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
