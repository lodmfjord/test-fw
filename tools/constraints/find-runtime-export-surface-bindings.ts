/**
 * @fileoverview Builds runtime binding maps for export-surface constraints.
 */
import * as ts from "typescript";

export type RuntimeBinding = {
  id: string;
  aliasName: string | undefined;
  isFunctionValue: boolean;
};

export type RuntimeBindingMap = Map<string, RuntimeBinding>;

/** Converts to binding id. */
function toBindingId(node: ts.Node): string {
  return `${node.pos}:${node.end}`;
}

/** Runs unwrap expression. */
function unwrapExpression(expression: ts.Expression): ts.Expression {
  if (ts.isParenthesizedExpression(expression)) {
    return unwrapExpression(expression.expression);
  }

  return expression;
}

/** Converts variable declaration values to runtime binding. */
function toVariableBinding(declaration: ts.VariableDeclaration): RuntimeBinding | undefined {
  if (!ts.isIdentifier(declaration.name)) {
    return undefined;
  }

  const initializer = declaration.initializer
    ? unwrapExpression(declaration.initializer)
    : undefined;
  const aliasName = initializer && ts.isIdentifier(initializer) ? initializer.text : undefined;
  const isFunctionValue =
    initializer !== undefined &&
    (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer));

  return {
    id: toBindingId(declaration),
    aliasName,
    isFunctionValue,
  };
}

/** Adds runtime bindings from import declarations. */
function addImportBindings(statement: ts.ImportDeclaration, bindings: RuntimeBindingMap): void {
  const importClause = statement.importClause;
  if (!importClause || ts.isTypeOnlyImportDeclaration(importClause)) {
    return;
  }

  if (importClause.name) {
    bindings.set(importClause.name.text, {
      id: toBindingId(importClause.name),
      aliasName: undefined,
      isFunctionValue: false,
    });
  }

  const namedBindings = importClause.namedBindings;
  if (!namedBindings) {
    return;
  }

  if (ts.isNamespaceImport(namedBindings)) {
    bindings.set(namedBindings.name.text, {
      id: toBindingId(namedBindings.name),
      aliasName: undefined,
      isFunctionValue: false,
    });
    return;
  }

  for (const element of namedBindings.elements) {
    if (element.isTypeOnly) {
      continue;
    }

    bindings.set(element.name.text, {
      id: toBindingId(element.name),
      aliasName: undefined,
      isFunctionValue: false,
    });
  }
}

/**
 * Converts source statements to runtime binding map.
 * @param sourceFile - Parsed source file.
 * @example
 * const bindings = toRuntimeBindingMap(sourceFile);
 * @returns Output value.
 */
export function toRuntimeBindingMap(sourceFile: ts.SourceFile): RuntimeBindingMap {
  const bindings: RuntimeBindingMap = new Map();

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      bindings.set(statement.name.text, {
        id: toBindingId(statement),
        aliasName: undefined,
        isFunctionValue: true,
      });
      continue;
    }

    if (ts.isClassDeclaration(statement) && statement.name) {
      bindings.set(statement.name.text, {
        id: toBindingId(statement),
        aliasName: undefined,
        isFunctionValue: false,
      });
      continue;
    }

    if (ts.isEnumDeclaration(statement)) {
      bindings.set(statement.name.text, {
        id: toBindingId(statement),
        aliasName: undefined,
        isFunctionValue: false,
      });
      continue;
    }

    if (ts.isImportDeclaration(statement)) {
      addImportBindings(statement, bindings);
      continue;
    }

    if (!ts.isVariableStatement(statement)) {
      continue;
    }

    for (const declaration of statement.declarationList.declarations) {
      const binding = toVariableBinding(declaration);
      if (!binding || !ts.isIdentifier(declaration.name)) {
        continue;
      }

      bindings.set(declaration.name.text, binding);
    }
  }

  return bindings;
}
