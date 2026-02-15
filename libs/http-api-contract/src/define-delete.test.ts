/**
 * @fileoverview Smoke tests for define-delete.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./define-delete";

describe("define-delete", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
