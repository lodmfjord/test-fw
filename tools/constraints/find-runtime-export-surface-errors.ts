/**
 * @fileoverview Finds runtime export-surface constraint violations.
 */
import { basename } from "node:path";
import * as ts from "typescript";
import { toRuntimeExportSurfaceContext } from "./find-runtime-export-surface-errors-context";

const MAX_RUNTIME_EXPORT_SYMBOLS = 1;
const SOURCE_FILE_EXTENSION_PATTERN = /\.(?:[cm]?[jt]sx?)$/;
const TEST_FILE_EXTENSION_PATTERN = /\.test\.(?:[cm]?[jt]sx?)$/;
const INDEX_FILE_EXTENSION_PATTERN = /^index\.(?:[cm]?[jt]sx?)$/;

/** Checks whether node has modifier kind. */
function hasModifier(
  node: ts.Node & {
    modifiers?: ts.NodeArray<ts.ModifierLike>;
  },
  kind: ts.SyntaxKind,
): boolean {
  return node.modifiers?.some((modifier) => modifier.kind === kind) ?? false;
}

/** Checks whether file path should validate runtime export surface constraints. */
function shouldValidateRuntimeExportSurface(filePath: string): boolean {
  if (!SOURCE_FILE_EXTENSION_PATTERN.test(filePath)) {
    return false;
  }

  if (filePath.endsWith(".d.ts")) {
    return false;
  }

  if (TEST_FILE_EXTENSION_PATTERN.test(filePath)) {
    return false;
  }

  return true;
}

/** Checks whether file path is an index source file. */
function isIndexSourceFilePath(filePath: string): boolean {
  return INDEX_FILE_EXTENSION_PATTERN.test(basename(filePath));
}

/** Checks whether object member is function-valued. */
function isFunctionValuedMember(
  member: ts.ObjectLiteralElementLike,
  functionValuedBindings: ReadonlyMap<string, boolean>,
): boolean {
  if (ts.isMethodDeclaration(member)) {
    return true;
  }

  if (ts.isShorthandPropertyAssignment(member)) {
    return functionValuedBindings.get(member.name.text) ?? false;
  }

  if (!ts.isPropertyAssignment(member)) {
    return false;
  }

  if (ts.isArrowFunction(member.initializer) || ts.isFunctionExpression(member.initializer)) {
    return true;
  }

  if (!ts.isIdentifier(member.initializer)) {
    return false;
  }

  return functionValuedBindings.get(member.initializer.text) ?? false;
}

/** Checks whether object literal has function-valued members. */
function hasFunctionValuedMembers(
  initializer: ts.Expression | undefined,
  functionValuedBindings: ReadonlyMap<string, boolean>,
): boolean {
  if (!initializer || !ts.isObjectLiteralExpression(initializer)) {
    return false;
  }

  for (const member of initializer.properties) {
    if (isFunctionValuedMember(member, functionValuedBindings)) {
      return true;
    }
  }

  return false;
}

/** Finds exported helper-object bag errors. */
function toExportedHelperObjectBagErrors(
  filePath: string,
  sourceFile: ts.SourceFile,
  functionValuedBindings: ReadonlyMap<string, boolean>,
): string[] {
  const errors: string[] = [];

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue;
    }

    if (!hasModifier(statement, ts.SyntaxKind.ExportKeyword)) {
      continue;
    }

    if ((statement.declarationList.flags & ts.NodeFlags.Const) === 0) {
      continue;
    }

    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) {
        continue;
      }

      if (!hasFunctionValuedMembers(declaration.initializer, functionValuedBindings)) {
        continue;
      }

      errors.push(
        `${filePath}: exported helper-object bags are not allowed ("${declaration.name.text}"). Keep helpers file-local and export one public entry function.`,
      );
    }
  }

  return errors;
}

/**
 * Finds runtime export-surface errors for a file.
 * @param filePath - Source file path.
 * @param source - Source file content.
 * @example
 * findRuntimeExportSurfaceErrors("libs/example/src/file.ts", "export const value = 1;");
 * @returns Output value.
 */
export function findRuntimeExportSurfaceErrors(filePath: string, source: string): string[] {
  if (!shouldValidateRuntimeExportSurface(filePath)) {
    return [];
  }

  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const context = toRuntimeExportSurfaceContext(sourceFile);
  const errors = toExportedHelperObjectBagErrors(
    filePath,
    sourceFile,
    context.functionValuedBindings,
  );

  if (isIndexSourceFilePath(filePath)) {
    return errors;
  }

  if (context.exportedRuntimeSymbolCount > MAX_RUNTIME_EXPORT_SYMBOLS) {
    errors.unshift(
      `${filePath}: has ${context.exportedRuntimeSymbolCount} exported runtime symbols (max ${MAX_RUNTIME_EXPORT_SYMBOLS}).`,
    );
  }

  return errors;
}
