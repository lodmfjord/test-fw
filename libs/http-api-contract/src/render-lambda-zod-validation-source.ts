/**
 * @fileoverview Implements render lambda zod validation source.
 */
import { toZodValidationCompilerSource } from "./render-lambda-zod-validation-compiler-source";
import { toZodValidationFoundationSource } from "./render-lambda-zod-validation-foundation-source";

/**
 * Converts to zod validation support source.
 * @example
 * toZodValidationSupportSource()
 * @returns Output value.
 */
export function toZodValidationSupportSource(): string {
  return `${toZodValidationFoundationSource()}\n${toZodValidationCompilerSource()}`;
}
