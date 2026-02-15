/**
 * @fileoverview Validates file-level repository constraints.
 */
import { basename } from "node:path";
import { findConsoleUsageErrors } from "./find-console-usage-errors";
import { findDocumentationConstraintsErrors } from "./find-documentation-constraints-errors";
import { findModuleConstraintsErrors } from "./find-module-constraints-errors";
import { findNestedTernaryErrors } from "./find-nested-ternary-errors";
import { findRuntimeExportSurfaceErrors } from "./find-runtime-export-surface-errors";
import { findSrcFunctionDensityErrors } from "./find-src-function-density-errors";
import { isWithinLineLimit } from "./is-within-line-limit";

const MAX_OTHER_FILE_LINES = 220;
const MAX_SRC_FILE_LINES = 220;
const MAX_TEST_FILE_LINES = 260;
const SOURCE_FILE_EXTENSION_PATTERN = /\.(?:[cm]?[jt]sx?)$/;
const TEST_FILE_EXTENSION_PATTERN = /\.test\.(?:[cm]?[jt]sx?)$/;
const KEBAB_CASE_FILE_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)*$/;

/** Checks whether file name is kebab-case. */
function isKebabCaseFileName(filePath: string): boolean {
  const fileName = basename(filePath);
  const sourceFileName = fileName.replace(/\.(?:[cm]?[jt]sx?)$/, "");
  return KEBAB_CASE_FILE_NAME_PATTERN.test(sourceFileName);
}

/** Checks whether file path is a source file. */
function isSourceFilePath(filePath: string): boolean {
  return SOURCE_FILE_EXTENSION_PATTERN.test(filePath) && !filePath.endsWith(".d.ts");
}

/** Checks whether file path is a test source file. */
function isTestSourceFilePath(filePath: string): boolean {
  return TEST_FILE_EXTENSION_PATTERN.test(filePath);
}

/** Checks whether file path is a non-test src source file. */
function isSrcNonTestSourceFilePath(filePath: string): boolean {
  return (
    isSourceFilePath(filePath) && filePath.includes("/src/") && !isTestSourceFilePath(filePath)
  );
}

/** Converts file path to max file line limit. */
function toMaxFileLines(filePath: string): number {
  if (isTestSourceFilePath(filePath)) {
    return MAX_TEST_FILE_LINES;
  }

  if (isSrcNonTestSourceFilePath(filePath)) {
    return MAX_SRC_FILE_LINES;
  }

  return MAX_OTHER_FILE_LINES;
}

/**
 * Runs validate file constraints.
 * @param filePath - File path parameter.
 * @param source - Source parameter.
 * @example
 * validateFileConstraints(filePath, source)
 * @returns Output value.
 */
export function validateFileConstraints(filePath: string, source: string): string[] {
  const errors: string[] = [
    ...findConsoleUsageErrors(filePath, source),
    ...findDocumentationConstraintsErrors(filePath, source),
    ...findModuleConstraintsErrors(filePath, source),
    ...findNestedTernaryErrors(filePath, source),
    ...findRuntimeExportSurfaceErrors(filePath, source),
    ...findSrcFunctionDensityErrors(filePath, source),
  ];
  const lineCount = source.split(/\r?\n/).length;
  const maxFileLines = toMaxFileLines(filePath);

  if (!isWithinLineLimit(source, maxFileLines)) {
    errors.push(`${filePath}: has ${lineCount} lines (max ${maxFileLines}).`);
  }

  if (!isKebabCaseFileName(filePath)) {
    errors.push(`${filePath}: file name must be kebab-case.`);
  }

  return errors;
}
