/**
 * @fileoverview Smoke tests for create-base-app.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./create-base-app";

describe("create-base-app", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
