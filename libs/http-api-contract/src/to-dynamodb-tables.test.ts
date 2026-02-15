/**
 * @fileoverview Smoke tests for to-dynamodb-tables.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./to-dynamodb-tables";

describe("to-dynamodb-tables", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
