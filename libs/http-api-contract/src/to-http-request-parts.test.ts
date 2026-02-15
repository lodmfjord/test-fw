/**
 * @fileoverview Smoke tests for to-http-request-parts.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./to-http-request-parts";

describe("to-http-request-parts", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
