/**
 * @fileoverview Smoke tests for to-endpoint-database-context.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./to-endpoint-database-context";

describe("to-endpoint-database-context", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
