/**
 * @fileoverview Smoke tests for define-patch.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./define-patch";

describe("define-patch", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
