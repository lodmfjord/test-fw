/**
 * @fileoverview Smoke tests for to-dev-app-response.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./to-dev-app-response";

describe("to-dev-app-response", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
