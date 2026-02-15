/**
 * @fileoverview Tests toZodValidationFoundationSource behavior.
 */
import { describe, expect, it } from "bun:test";
import { toZodValidationFoundationSource } from "./render-lambda-zod-validation-foundation-source";

describe("toZodValidationFoundationSource", () => {
  it("returns foundation helpers used by runtime validation", () => {
    const source = toZodValidationFoundationSource();

    expect(source).toContain("const SUPPORTED_SCHEMA_KEYS");
    expect(source).toContain("function resolveRef");
    expect(source).toContain("function assertSupportedSchemaKeywords");
    expect(source).toContain("function withCommonModifiers");
    expect(source).toContain("const rootValidatorCache = new WeakMap()");
  });
});
