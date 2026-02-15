/**
 * @fileoverview Finds direct console usage constraint violations.
 */
import { basename } from "node:path";
import * as ts from "typescript";

/** Checks whether file path is allowed for direct console usage. */
function isAllowedConsoleUsageFile(filePath: string): boolean {
  return filePath.endsWith(".test.ts") || basename(filePath).endsWith("-bin.ts");
}

/**
 * Runs find console usage errors.
 * @param filePath - File path parameter.
 * @param source - Source parameter.
 * @example
 * findConsoleUsageErrors(filePath, source)
 * @returns Output value.
 */
export function findConsoleUsageErrors(filePath: string, source: string): string[] {
  if (isAllowedConsoleUsageFile(filePath)) {
    return [];
  }

  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const errors: string[] = [];

  /** Visits nodes for console call expressions. */
  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const objectExpression = node.expression.expression;
      const methodName = node.expression.name.text;
      if (ts.isIdentifier(objectExpression) && objectExpression.text === "console") {
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        errors.push(
          `${filePath}:${line + 1}: direct console.${methodName} calls are not allowed in runtime code; inject a logger instead.`,
        );
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return errors;
}
