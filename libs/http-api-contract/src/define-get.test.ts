/**
 * @fileoverview Smoke tests for define-get.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./define-get";

describe("define-get", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
