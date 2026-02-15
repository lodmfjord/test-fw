/**
 * @fileoverview Tests toZodValidationSupportSource behavior.
 */
import { describe, expect, it } from "bun:test";
import { toZodValidationCompilerSource } from "./render-lambda-zod-validation-compiler-source";
import { toZodValidationFoundationSource } from "./render-lambda-zod-validation-foundation-source";
import { toZodValidationSupportSource } from "./render-lambda-zod-validation-source";

describe("toZodValidationSupportSource", () => {
  it("combines foundation and compiler sources with a newline", () => {
    expect(toZodValidationSupportSource()).toBe(
      `${toZodValidationFoundationSource()}\n${toZodValidationCompilerSource()}`,
    );
  });
});
