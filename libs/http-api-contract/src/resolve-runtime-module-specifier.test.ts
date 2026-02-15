/**
 * @fileoverview Tests resolveRuntimeModuleSpecifier behavior.
 */
import { describe, expect, it } from "bun:test";
import { resolveRuntimeModuleSpecifier } from "./resolve-runtime-module-specifier";

describe("resolveRuntimeModuleSpecifier", () => {
  it("resolves known modules relative to the endpoint module", () => {
    const resolved = resolveRuntimeModuleSpecifier(import.meta.url, "node:path", "./fallback.js");

    expect(resolved.includes("path")).toBe(true);
  });

  it("falls back to framework-relative path when module cannot be resolved", () => {
    const resolved = resolveRuntimeModuleSpecifier(
      import.meta.url,
      "@not-a-real/module-name",
      "./fallback.js",
    );

    expect(resolved.endsWith("fallback.js")).toBe(true);
  });
});
