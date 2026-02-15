/**
 * @fileoverview Smoke tests for render-used-import-lines.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./render-used-import-lines";

describe("render-used-import-lines", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
