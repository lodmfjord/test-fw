/**
 * @fileoverview Smoke tests for assert-unique-listener-ids.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./assert-unique-listener-ids";

describe("assert-unique-listener-ids", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
