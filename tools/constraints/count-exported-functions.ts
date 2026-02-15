/**
 * @fileoverview Implements count exported functions.
 */
import * as ts from "typescript";

type FunctionBindingMap = Map<string, string>;

/** Converts to binding id. */ function toBindingId(node: ts.Node): string {
  return `${node.pos}:${node.end}`;
}

/** Checks whether has modifier. */ function hasModifier(
  node: ts.Node & {
    modifiers?: ts.NodeArray<ts.ModifierLike>;
  },
  kind: ts.SyntaxKind,
): boolean {
  return node.modifiers?.some((modifier) => modifier.kind === kind) ?? false;
}

/** Runs unwrap expression. */ function unwrapExpression(expression: ts.Expression): ts.Expression {
  if (ts.isParenthesizedExpression(expression)) {
    return unwrapExpression(expression.expression);
  }

  return expression;
}

/** Converts to bound function expression. */ function toBoundFunctionExpression(
  expression: ts.Expression | undefined,
): ts.FunctionExpression | ts.ArrowFunction | undefined {
  if (!expression) {
    return undefined;
  }

  const normalized = unwrapExpression(expression);
  if (ts.isArrowFunction(normalized) || ts.isFunctionExpression(normalized)) {
    return normalized;
  }

  return undefined;
}

/** Converts to function binding map. */ function toFunctionBindingMap(
  sourceFile: ts.SourceFile,
): FunctionBindingMap {
  const bindings: FunctionBindingMap = new Map();
  const aliases: Array<{ aliasName: string; sourceName: string }> = [];

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      bindings.set(statement.name.text, toBindingId(statement));
      continue;
    }

    if (!ts.isVariableStatement(statement)) {
      continue;
    }

    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) {
        continue;
      }

      const declarationName = declaration.name.text;
      const functionExpression = toBoundFunctionExpression(declaration.initializer);
      if (functionExpression) {
        bindings.set(declarationName, toBindingId(functionExpression));
        continue;
      }

      if (declaration.initializer && ts.isIdentifier(declaration.initializer)) {
        aliases.push({
          aliasName: declarationName,
          sourceName: declaration.initializer.text,
        });
      }
    }
  }

  let hasUpdates = true;
  while (hasUpdates) {
    hasUpdates = false;
    for (const alias of aliases) {
      if (bindings.has(alias.aliasName)) {
        continue;
      }

      const bindingId = bindings.get(alias.sourceName);
      if (!bindingId) {
        continue;
      }

      bindings.set(alias.aliasName, bindingId);
      hasUpdates = true;
    }
  }

  return bindings;
}

/** Runs collect named exported functions. */ function collectNamedExportedFunctions(
  sourceFile: ts.SourceFile,
  bindings: FunctionBindingMap,
  exportedBindingIds: Set<string>,
): void {
  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement)) {
      if (!hasModifier(statement, ts.SyntaxKind.ExportKeyword)) {
        continue;
      }

      if (statement.name) {
        const bindingId = bindings.get(statement.name.text);
        if (bindingId) {
          exportedBindingIds.add(bindingId);
        }
        continue;
      }

      exportedBindingIds.add(toBindingId(statement));
      continue;
    }

    if (ts.isVariableStatement(statement)) {
      if (!hasModifier(statement, ts.SyntaxKind.ExportKeyword)) {
        continue;
      }

      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name)) {
          continue;
        }

        const bindingId = bindings.get(declaration.name.text);
        if (bindingId) {
          exportedBindingIds.add(bindingId);
        }
      }
      continue;
    }

    if (ts.isExportDeclaration(statement)) {
      if (statement.isTypeOnly || statement.moduleSpecifier || !statement.exportClause) {
        continue;
      }

      if (!ts.isNamedExports(statement.exportClause)) {
        continue;
      }

      for (const element of statement.exportClause.elements) {
        if (element.isTypeOnly) {
          continue;
        }

        const sourceName = (element.propertyName ?? element.name).text;
        const bindingId = bindings.get(sourceName);
        if (bindingId) {
          exportedBindingIds.add(bindingId);
        }
      }
      continue;
    }

    if (!ts.isExportAssignment(statement)) {
      continue;
    }

    const expression = unwrapExpression(statement.expression);
    const functionExpression = toBoundFunctionExpression(expression);
    if (functionExpression) {
      exportedBindingIds.add(toBindingId(functionExpression));
      continue;
    }

    if (ts.isIdentifier(expression)) {
      const bindingId = bindings.get(expression.text);
      if (bindingId) {
        exportedBindingIds.add(bindingId);
      }
    }
  }
}

/**
 * Runs count exported functions.
 * @param source - Source parameter.
 * @example
 * countExportedFunctions(source)
 * @returns Output value.
 */ export function countExportedFunctions(source: string): number {
  const sourceFile = ts.createSourceFile(
    "source.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const bindings = toFunctionBindingMap(sourceFile);
  const exportedBindingIds = new Set<string>();
  collectNamedExportedFunctions(sourceFile, bindings, exportedBindingIds);

  return exportedBindingIds.size;
}
