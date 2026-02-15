/**
 * @fileoverview Smoke tests for to-import-path.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./to-import-path";

describe("to-import-path", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
