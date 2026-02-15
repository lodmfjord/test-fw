/**
 * @fileoverview Smoke tests for define-dynamo-db-table.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./define-dynamo-db-table";

describe("define-dynamo-db-table", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
