/**
 * @fileoverview Finds nested ternary operation constraint violations.
 */
import * as ts from "typescript";

/** Checks whether source contains nested ternary operations. */
function hasNestedTernary(sourceFile: ts.SourceFile): boolean {
  let foundNestedTernary = false;

  /** Visits syntax nodes and tracks conditional-expression nesting. */
  function visit(node: ts.Node, insideConditionalExpression: boolean): void {
    if (foundNestedTernary) {
      return;
    }

    if (ts.isConditionalExpression(node)) {
      if (insideConditionalExpression) {
        foundNestedTernary = true;
        return;
      }

      visit(node.condition, true);
      visit(node.whenTrue, true);
      visit(node.whenFalse, true);
      return;
    }

    ts.forEachChild(node, (child) => visit(child, insideConditionalExpression));
  }

  visit(sourceFile, false);
  return foundNestedTernary;
}

/**
 * Runs find nested ternary errors.
 * @param filePath - File path parameter.
 * @param source - Source parameter.
 * @example
 * findNestedTernaryErrors(filePath, source)
 * @returns Output value.
 */
export function findNestedTernaryErrors(filePath: string, source: string): string[] {
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  return hasNestedTernary(sourceFile)
    ? [`${filePath}: nested ternary operations are not allowed.`]
    : [];
}
