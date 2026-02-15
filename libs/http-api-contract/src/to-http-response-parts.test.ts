/**
 * @fileoverview Smoke tests for to-http-response-parts.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./to-http-response-parts";

describe("to-http-response-parts", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
