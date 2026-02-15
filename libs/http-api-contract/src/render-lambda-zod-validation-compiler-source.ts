/**
 * @fileoverview Implements render lambda zod validation compiler source.
 */
import { ZOD_VALIDATION_COMPILER_SOURCE_HEAD } from "./render-lambda-zod-validation-compiler-source-head";
import { ZOD_VALIDATION_COMPILER_SOURCE_TAIL } from "./render-lambda-zod-validation-compiler-source-tail";

const ZOD_VALIDATION_COMPILER_SOURCE = `${ZOD_VALIDATION_COMPILER_SOURCE_HEAD}${ZOD_VALIDATION_COMPILER_SOURCE_TAIL}`;

/**
 * Converts values to zod validation compiler source.
 * @example
 * toZodValidationCompilerSource()
 */
export function toZodValidationCompilerSource(): string {
  return ZOD_VALIDATION_COMPILER_SOURCE;
}
