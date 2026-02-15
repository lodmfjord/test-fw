/**
 * @fileoverview Implements helper utilities for src function density constraints.
 */
import * as ts from "typescript";

const SRC_PATH_SEGMENT = "/src/";
const TEST_FILE_PATTERN = /\.(?:test|spec)\.[cm]?[jt]sx?$/;

type FunctionNode = ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction;

type ComplexityPointHandler = (score: number) => void;

type FunctionDensity = {
  cognitiveComplexity: number;
  lineCount: number;
  name: string;
  startLine: number;
};

/** Converts values to posix path. */
function toPosixPath(filePath: string): string {
  return filePath.replaceAll("\\", "/");
}

/** Checks whether path is a src source file target. */
function isSrcSourceFilePath(filePath: string): boolean {
  const normalized = toPosixPath(filePath);
  return normalized.includes(SRC_PATH_SEGMENT) && !TEST_FILE_PATTERN.test(normalized);
}

/** Converts values to function name. */
function toFunctionName(node: FunctionNode): string {
  if ((ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) && node.name) {
    return node.name.text;
  }

  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
    const parent = node.parent;
    if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
      return parent.name.text;
    }
  }

  return "<anonymous>";
}

/** Converts values to source line number. */
function toLineNumber(sourceFile: ts.SourceFile, position: number): number {
  return sourceFile.getLineAndCharacterOfPosition(position).line + 1;
}

/** Converts values to function line count. */
function toFunctionLineCount(sourceFile: ts.SourceFile, node: FunctionNode): number {
  const startLine = toLineNumber(sourceFile, node.getStart(sourceFile));
  const endLine = toLineNumber(sourceFile, node.end);
  return endLine - startLine + 1;
}

/** Handles visit complexity node. */
function visitComplexityNode(
  node: ts.Node,
  nesting: number,
  onComplexityPoint: ComplexityPointHandler,
): void {
  if (ts.isFunctionLike(node)) {
    return;
  }

  if (ts.isIfStatement(node)) {
    onComplexityPoint(1 + nesting);
    visitComplexityNode(node.expression, nesting, onComplexityPoint);
    visitComplexityNode(node.thenStatement, nesting + 1, onComplexityPoint);
    if (node.elseStatement) {
      if (ts.isIfStatement(node.elseStatement)) {
        visitComplexityNode(node.elseStatement, nesting, onComplexityPoint);
      } else {
        visitComplexityNode(node.elseStatement, nesting + 1, onComplexityPoint);
      }
    }
    return;
  }

  if (ts.isConditionalExpression(node)) {
    onComplexityPoint(1 + nesting);
    visitComplexityNode(node.condition, nesting, onComplexityPoint);
    visitComplexityNode(node.whenTrue, nesting + 1, onComplexityPoint);
    visitComplexityNode(node.whenFalse, nesting + 1, onComplexityPoint);
    return;
  }

  if (
    ts.isForStatement(node) ||
    ts.isForInStatement(node) ||
    ts.isForOfStatement(node) ||
    ts.isWhileStatement(node) ||
    ts.isDoStatement(node) ||
    ts.isCatchClause(node)
  ) {
    onComplexityPoint(1 + nesting);
    ts.forEachChild(node, (child) => visitComplexityNode(child, nesting + 1, onComplexityPoint));
    return;
  }

  if (ts.isSwitchStatement(node)) {
    onComplexityPoint(1 + nesting);
    visitComplexityNode(node.expression, nesting, onComplexityPoint);
    for (const clause of node.caseBlock.clauses) {
      onComplexityPoint(1 + nesting);
      for (const statement of clause.statements) {
        visitComplexityNode(statement, nesting + 1, onComplexityPoint);
      }
    }
    return;
  }

  if (
    ts.isBinaryExpression(node) &&
    (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
      node.operatorToken.kind === ts.SyntaxKind.BarBarToken)
  ) {
    onComplexityPoint(1);
    visitComplexityNode(node.left, nesting, onComplexityPoint);
    visitComplexityNode(node.right, nesting, onComplexityPoint);
    return;
  }

  ts.forEachChild(node, (child) => visitComplexityNode(child, nesting, onComplexityPoint));
}

/** Converts values to cognitive complexity. */
function toCognitiveComplexity(node: FunctionNode): number {
  let score = 0;
  const body = node.body;
  if (!body) {
    return 0;
  }

  /** Handles complexity point accounting. */
  const onComplexityPoint = (point: number): void => {
    score += point;
  };
  if (ts.isBlock(body)) {
    for (const statement of body.statements) {
      visitComplexityNode(statement, 0, onComplexityPoint);
    }
    return score;
  }

  visitComplexityNode(body, 0, onComplexityPoint);
  return score;
}

/** Converts values to function density records. */
function toFunctionDensities(sourceFile: ts.SourceFile): FunctionDensity[] {
  const densities: FunctionDensity[] = [];

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.body) {
      densities.push({
        cognitiveComplexity: toCognitiveComplexity(statement),
        lineCount: toFunctionLineCount(sourceFile, statement),
        name: toFunctionName(statement),
        startLine: toLineNumber(sourceFile, statement.getStart(sourceFile)),
      });
      continue;
    }

    if (!ts.isVariableStatement(statement)) {
      continue;
    }

    for (const declaration of statement.declarationList.declarations) {
      const initializer = declaration.initializer;
      if (!initializer) {
        continue;
      }

      if (!ts.isArrowFunction(initializer) && !ts.isFunctionExpression(initializer)) {
        continue;
      }

      densities.push({
        cognitiveComplexity: toCognitiveComplexity(initializer),
        lineCount: toFunctionLineCount(sourceFile, initializer),
        name: toFunctionName(initializer),
        startLine: toLineNumber(sourceFile, initializer.getStart(sourceFile)),
      });
    }
  }

  return densities;
}

/** Converts values to source file. */
function toSourceFile(filePath: string, source: string): ts.SourceFile {
  return ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

export const findSrcFunctionDensityErrorsHelpers = {
  isSrcSourceFilePath,
  toFunctionDensities,
  toSourceFile,
};
