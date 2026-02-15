/**
 * @fileoverview Smoke tests for list-defined-endpoints.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./list-defined-endpoints";

describe("list-defined-endpoints", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
