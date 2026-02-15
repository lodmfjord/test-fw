import { toZodValidationCompilerSource } from "./render-lambda-zod-validation-compiler-source";
import { toZodValidationFoundationSource } from "./render-lambda-zod-validation-foundation-source";

export function toZodValidationSupportSource(): string {
  return `${toZodValidationFoundationSource()}\n${toZodValidationCompilerSource()}`;
}
