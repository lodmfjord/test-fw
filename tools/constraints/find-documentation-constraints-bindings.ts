/**
 * @fileoverview Implements function-binding helpers for documentation constraints.
 */
import * as ts from "typescript";

type FunctionLikeBinding = {
  exported: boolean;
  functionNode: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression;
  name: string;
  node: ts.FunctionDeclaration | ts.VariableStatement;
  parameters: ts.NodeArray<ts.ParameterDeclaration>;
  variableDeclaration?: ts.VariableDeclaration;
};

/** Checks whether a node has a given modifier. */
function hasModifier(
  node: ts.Node & {
    modifiers?: ts.NodeArray<ts.ModifierLike>;
  },
  kind: ts.SyntaxKind,
): boolean {
  return node.modifiers?.some((modifier) => modifier.kind === kind) ?? false;
}

/** Collects function-like bindings from a source file. */
function toFunctionBindings(sourceFile: ts.SourceFile): FunctionLikeBinding[] {
  const bindings: FunctionLikeBinding[] = [];

  /** Visits AST nodes and collects function-like bindings. */
  function visit(node: ts.Node): void {
    if (ts.isFunctionDeclaration(node) && node.body) {
      bindings.push({
        exported: hasModifier(node, ts.SyntaxKind.ExportKeyword),
        functionNode: node,
        name: node.name?.text ?? "<default>",
        node,
        parameters: node.parameters,
      });
    }

    if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || !declaration.initializer) {
          continue;
        }
        if (
          !ts.isArrowFunction(declaration.initializer) &&
          !ts.isFunctionExpression(declaration.initializer)
        ) {
          continue;
        }

        bindings.push({
          exported: hasModifier(node, ts.SyntaxKind.ExportKeyword),
          functionNode: declaration.initializer,
          name: declaration.name.text,
          node,
          parameters: declaration.initializer.parameters,
          variableDeclaration: declaration,
        });
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return bindings;
}

export type { FunctionLikeBinding };
const findDocumentationConstraintsBindings = {
  toFunctionBindings,
};

export { findDocumentationConstraintsBindings };
