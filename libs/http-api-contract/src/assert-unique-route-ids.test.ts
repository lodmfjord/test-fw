/**
 * @fileoverview Smoke tests for assert-unique-route-ids.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./assert-unique-route-ids";

describe("assert-unique-route-ids", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
