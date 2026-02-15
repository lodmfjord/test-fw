/**
 * @fileoverview Smoke tests for create-fake-layer-modules-for-test.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./create-fake-layer-modules-for-test";

describe("create-fake-layer-modules-for-test", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
