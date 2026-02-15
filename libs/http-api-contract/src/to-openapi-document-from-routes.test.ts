/**
 * @fileoverview Smoke tests for to-openapi-document-from-routes.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./to-openapi-document-from-routes";

describe("to-openapi-document-from-routes", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
