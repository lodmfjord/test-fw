/**
 * @fileoverview Smoke tests for to-lambda-layer-metadata.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./to-lambda-layer-metadata";

describe("to-lambda-layer-metadata", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
