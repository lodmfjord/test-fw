/**
 * @fileoverview Tests toZodValidationCompilerSource behavior.
 */
import { describe, expect, it } from "bun:test";
import { toZodValidationCompilerSource } from "./render-lambda-zod-validation-compiler-source";
import { ZOD_VALIDATION_COMPILER_SOURCE_HEAD } from "./render-lambda-zod-validation-compiler-source-head";
import { ZOD_VALIDATION_COMPILER_SOURCE_TAIL } from "./render-lambda-zod-validation-compiler-source-tail";

describe("toZodValidationCompilerSource", () => {
  it("concatenates head and tail compiler segments", () => {
    expect(toZodValidationCompilerSource()).toBe(
      `${ZOD_VALIDATION_COMPILER_SOURCE_HEAD}${ZOD_VALIDATION_COMPILER_SOURCE_TAIL}`,
    );
  });

  it("includes root compiler entry points", () => {
    const source = toZodValidationCompilerSource();

    expect(source).toContain("function toTypedZodSchema");
    expect(source).toContain("function toNodeZodSchema");
    expect(source).toContain("function parseBySchema");
  });
});
