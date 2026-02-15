/**
 * @fileoverview Smoke tests for resolve-path-from-settings.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./resolve-path-from-settings";

describe("resolve-path-from-settings", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
