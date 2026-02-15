/** @fileoverview Validates file-level repository constraints. @module tools/constraints/validate-file-constraints */
import { basename } from "node:path";
import { countExportedFunctions } from "./count-exported-functions";
import { findDocumentationConstraintsErrors } from "./find-documentation-constraints-errors";
import { findModuleConstraintsErrors } from "./find-module-constraints-errors";
import { isWithinLineLimit } from "./is-within-line-limit";

const MAX_EXPORTED_FUNCTIONS = 1;
const MAX_LINES = 300;
const KEBAB_CASE_FILE_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)*$/;

/** Checks whether file name is kebab-case. */
function isKebabCaseFileName(filePath: string): boolean {
  const fileName = basename(filePath);
  const sourceFileName = fileName.replace(/\.(?:[cm]?[jt]sx?)$/, "");
  return KEBAB_CASE_FILE_NAME_PATTERN.test(sourceFileName);
}

/** Validates file constraints. @example `validateFileConstraints("libs/a/src/file.ts", source)` */
export function validateFileConstraints(filePath: string, source: string): string[] {
  const errors: string[] = [
    ...findDocumentationConstraintsErrors(filePath, source),
    ...findModuleConstraintsErrors(filePath, source),
  ];
  const exportCount = countExportedFunctions(source);
  const lineCount = source.split(/\r?\n/).length;

  if (exportCount > MAX_EXPORTED_FUNCTIONS) {
    errors.push(
      `${filePath}: has ${exportCount} exported functions (max ${MAX_EXPORTED_FUNCTIONS}).`,
    );
  }

  if (!isWithinLineLimit(source, MAX_LINES)) {
    errors.push(`${filePath}: has ${lineCount} lines (max ${MAX_LINES}).`);
  }

  if (!isKebabCaseFileName(filePath)) {
    errors.push(`${filePath}: file name must be kebab-case.`);
  }

  return errors;
}
