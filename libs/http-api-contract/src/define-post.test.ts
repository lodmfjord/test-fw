/**
 * @fileoverview Smoke tests for define-post.
 */
import { describe, expect, it } from "bun:test";
import * as moduleUnderTest from "./define-post";

describe("define-post", () => {
  it("exports at least one callable function", () => {
    const functionExports = Object.values(moduleUnderTest).filter(
      (value) => typeof value === "function",
    );

    expect(functionExports.length).toBeGreaterThan(0);
  });
});
