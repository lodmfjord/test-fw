/**
 * @fileoverview Smoke tests for render-lambda-env-bootstrap-source.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./render-lambda-env-bootstrap-source";

describe("render-lambda-env-bootstrap-source", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
