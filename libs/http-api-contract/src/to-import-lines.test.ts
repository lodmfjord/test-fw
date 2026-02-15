/**
 * @fileoverview Smoke tests for to-import-lines.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./to-import-lines";

describe("to-import-lines", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
