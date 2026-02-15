/**
 * @fileoverview Builds runtime export-surface context for constraint checks.
 */
import * as ts from "typescript";
import { toRuntimeBindingMap } from "./find-runtime-export-surface-bindings";
import type { RuntimeBinding, RuntimeBindingMap } from "./find-runtime-export-surface-bindings";

export type RuntimeExportSurfaceContext = {
  exportedRuntimeSymbolCount: number;
  functionValuedBindings: ReadonlyMap<string, boolean>;
};

/** Converts to binding id. */
function toBindingId(node: ts.Node): string {
  return `${node.pos}:${node.end}`;
}

/** Checks whether node has modifier kind. */
function hasModifier(
  node: ts.Node & {
    modifiers?: ts.NodeArray<ts.ModifierLike>;
  },
  kind: ts.SyntaxKind,
): boolean {
  return node.modifiers?.some((modifier) => modifier.kind === kind) ?? false;
}

/** Runs unwrap expression. */
function unwrapExpression(expression: ts.Expression): ts.Expression {
  if (ts.isParenthesizedExpression(expression)) {
    return unwrapExpression(expression.expression);
  }

  return expression;
}

/** Resolves binding aliases to canonical binding info. */
function toResolvedBinding(
  bindings: RuntimeBindingMap,
  bindingName: string,
  seen: Set<string> = new Set(),
): RuntimeBinding | undefined {
  const binding = bindings.get(bindingName);
  if (!binding) {
    return undefined;
  }

  if (!binding.aliasName) {
    return binding;
  }

  if (seen.has(bindingName)) {
    return binding;
  }

  seen.add(bindingName);
  const target = toResolvedBinding(bindings, binding.aliasName, seen);
  if (!target) {
    return binding;
  }

  return {
    id: target.id,
    aliasName: target.aliasName,
    isFunctionValue: target.isFunctionValue,
  };
}

/** Converts re-export specifier values to synthetic binding id. */
function toSyntheticExportBindingId(
  statement: ts.ExportDeclaration,
  element: ts.ExportSpecifier,
): string {
  return `${toBindingId(statement)}:${element.name.text}:${(element.propertyName ?? element.name).text}`;
}

/** Collects exported runtime binding ids from source statements. */
function toExportedRuntimeBindingIds(
  sourceFile: ts.SourceFile,
  bindings: RuntimeBindingMap,
): Set<string> {
  const exportedBindingIds = new Set<string>();

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement)) {
      if (!hasModifier(statement, ts.SyntaxKind.ExportKeyword)) {
        continue;
      }

      if (statement.name) {
        const binding = toResolvedBinding(bindings, statement.name.text);
        exportedBindingIds.add(binding?.id ?? toBindingId(statement));
        continue;
      }

      exportedBindingIds.add(toBindingId(statement));
      continue;
    }

    if (ts.isClassDeclaration(statement)) {
      if (!hasModifier(statement, ts.SyntaxKind.ExportKeyword)) {
        continue;
      }

      if (statement.name) {
        const binding = toResolvedBinding(bindings, statement.name.text);
        exportedBindingIds.add(binding?.id ?? toBindingId(statement));
        continue;
      }

      exportedBindingIds.add(toBindingId(statement));
      continue;
    }

    if (ts.isEnumDeclaration(statement)) {
      if (!hasModifier(statement, ts.SyntaxKind.ExportKeyword)) {
        continue;
      }

      const binding = toResolvedBinding(bindings, statement.name.text);
      exportedBindingIds.add(binding?.id ?? toBindingId(statement));
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

        const binding = toResolvedBinding(bindings, declaration.name.text);
        exportedBindingIds.add(binding?.id ?? toBindingId(declaration));
      }
      continue;
    }

    if (ts.isExportDeclaration(statement)) {
      if (
        statement.isTypeOnly ||
        !statement.exportClause ||
        !ts.isNamedExports(statement.exportClause)
      ) {
        continue;
      }

      for (const element of statement.exportClause.elements) {
        if (element.isTypeOnly) {
          continue;
        }

        const sourceName = (element.propertyName ?? element.name).text;
        const binding = toResolvedBinding(bindings, sourceName);
        if (binding) {
          exportedBindingIds.add(binding.id);
          continue;
        }

        exportedBindingIds.add(toSyntheticExportBindingId(statement, element));
      }
      continue;
    }

    if (!ts.isExportAssignment(statement)) {
      continue;
    }

    const expression = unwrapExpression(statement.expression);
    if (ts.isIdentifier(expression)) {
      const binding = toResolvedBinding(bindings, expression.text);
      exportedBindingIds.add(binding?.id ?? toBindingId(statement));
      continue;
    }

    exportedBindingIds.add(toBindingId(statement));
  }

  return exportedBindingIds;
}

/** Converts to function-valued binding lookup map. */
function toFunctionValuedBindings(bindings: RuntimeBindingMap): ReadonlyMap<string, boolean> {
  const functionValuedBindings = new Map<string, boolean>();

  for (const [bindingName] of bindings) {
    const binding = toResolvedBinding(bindings, bindingName);
    functionValuedBindings.set(bindingName, binding?.isFunctionValue ?? false);
  }

  return functionValuedBindings;
}

/**
 * Builds runtime export-surface context for a source file.
 * @param sourceFile - Parsed source file.
 * @example
 * const context = toRuntimeExportSurfaceContext(sourceFile);
 * @returns Output value.
 */
export function toRuntimeExportSurfaceContext(
  sourceFile: ts.SourceFile,
): RuntimeExportSurfaceContext {
  const bindings = toRuntimeBindingMap(sourceFile);
  return {
    exportedRuntimeSymbolCount: toExportedRuntimeBindingIds(sourceFile, bindings).size,
    functionValuedBindings: toFunctionValuedBindings(bindings),
  };
}
