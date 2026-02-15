/**
 * @fileoverview Finds unsafe cast constraint violations.
 */
import * as ts from "typescript";

const TEST_FILE_EXTENSION_PATTERN = /\.test\.(?:[cm]?[jt]sx?)$/;
const UNSAFE_CAST_MARKER_PATTERN = /^\s*\/\/\s*unsafe-cast:/;

/** Checks whether file path is exempt from unsafe cast constraints. */
function isUnsafeCastExemptFilePath(filePath: string): boolean {
  return TEST_FILE_EXTENSION_PATTERN.test(filePath);
}

/** Checks whether a cast node is an "as never" cast. */
function isAsNeverCast(node: ts.AsExpression): boolean {
  return node.type.kind === ts.SyntaxKind.NeverKeyword;
}

/** Checks whether a cast node is an "as unknown as" chain. */
function isAsUnknownAsCast(node: ts.AsExpression): boolean {
  if (!ts.isAsExpression(node.expression)) {
    return false;
  }

  return node.expression.type.kind === ts.SyntaxKind.UnknownKeyword;
}

/** Checks whether previous line contains an unsafe-cast marker comment. */
function hasPreviousLineUnsafeCastMarker(line: number, sourceLines: string[]): boolean {
  if (line <= 1) {
    return false;
  }

  const previousLine = sourceLines[line - 2] ?? "";
  return UNSAFE_CAST_MARKER_PATTERN.test(previousLine);
}

/**
 * Runs find unsafe cast errors.
 * @param filePath - File path parameter.
 * @param source - Source parameter.
 * @example
 * findUnsafeCastErrors(filePath, source)
 * @returns Output value.
 */
export function findUnsafeCastErrors(filePath: string, source: string): string[] {
  if (isUnsafeCastExemptFilePath(filePath)) {
    return [];
  }

  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const sourceLines = source.split(/\r?\n/);
  const errors: string[] = [];

  /** Visits nodes for unsafe casts. */
  function visit(node: ts.Node): void {
    if (ts.isAsExpression(node)) {
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      const lineNumber = line + 1;

      if (isAsNeverCast(node)) {
        errors.push(
          `${filePath}:${lineNumber}: unsafe cast "as never" is not allowed in non-test code.`,
        );
      }

      if (isAsUnknownAsCast(node) && !hasPreviousLineUnsafeCastMarker(lineNumber, sourceLines)) {
        errors.push(
          `${filePath}:${lineNumber}: unsafe cast "as unknown as" requires an immediately preceding "// unsafe-cast:" comment.`,
        );
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return errors;
}
