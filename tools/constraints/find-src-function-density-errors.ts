/**
 * @fileoverview Finds src-only function density constraint violations.
 */
import { findSrcFunctionDensityErrorsHelpers } from "./find-src-function-density-errors-helpers";

const MAX_SRC_FUNCTION_LINES = 160;
const MAX_SRC_FUNCTION_COGNITIVE_COMPLEXITY = 30;

/**
 * Handles find src function density errors.
 * @param filePath - File path parameter.
 * @param source - Source parameter.
 * @example
 * findSrcFunctionDensityErrors(filePath, source)
 */
export function findSrcFunctionDensityErrors(filePath: string, source: string): string[] {
  if (!findSrcFunctionDensityErrorsHelpers.isSrcSourceFilePath(filePath)) {
    return [];
  }

  const sourceFile = findSrcFunctionDensityErrorsHelpers.toSourceFile(filePath, source);
  const errors: string[] = [];

  for (const density of findSrcFunctionDensityErrorsHelpers.toFunctionDensities(sourceFile)) {
    if (density.lineCount > MAX_SRC_FUNCTION_LINES) {
      errors.push(
        `${filePath}:${density.startLine}: function "${density.name}" has ${density.lineCount} lines (max ${MAX_SRC_FUNCTION_LINES}).`,
      );
    }

    if (density.cognitiveComplexity > MAX_SRC_FUNCTION_COGNITIVE_COMPLEXITY) {
      errors.push(
        `${filePath}:${density.startLine}: function "${density.name}" has cognitive complexity ${density.cognitiveComplexity} (max ${MAX_SRC_FUNCTION_COGNITIVE_COMPLEXITY}).`,
      );
    }
  }

  return errors;
}
