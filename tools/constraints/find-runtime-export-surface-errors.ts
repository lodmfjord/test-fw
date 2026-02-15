/**
 * @fileoverview Finds runtime export-surface constraint violations.
 */
import { basename } from "node:path";
import * as ts from "typescript";
import { toRuntimeExportSurfaceContext } from "./find-runtime-export-surface-errors-context";
import { RUNTIME_EXPORT_SURFACE_HELPER_OBJECT_BAG_ALLOWLIST } from "./runtime-export-surface-helper-object-bag-allowlist";

const MAX_RUNTIME_EXPORT_SYMBOLS = 1;
const SOURCE_FILE_EXTENSION_PATTERN = /\.(?:[cm]?[jt]sx?)$/;
const TEST_FILE_EXTENSION_PATTERN = /\.test\.(?:[cm]?[jt]sx?)$/;
const INDEX_FILE_EXTENSION_PATTERN = /^index\.(?:[cm]?[jt]sx?)$/;

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

/** Collects const declarations that are exported through any local export syntax. */
function toExportedConstDeclarations(sourceFile: ts.SourceFile): ts.VariableDeclaration[] {
  const constDeclarations = new Map<string, ts.VariableDeclaration>();
  const exportedBindingNames = new Set<string>();

  for (const statement of sourceFile.statements) {
    if (ts.isVariableStatement(statement)) {
      if ((statement.declarationList.flags & ts.NodeFlags.Const) === 0) {
        continue;
      }

      const isExported =
        statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ??
        false;
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name)) {
          continue;
        }

        constDeclarations.set(declaration.name.text, declaration);
        if (isExported) {
          exportedBindingNames.add(declaration.name.text);
        }
      }
      continue;
    }

    if (ts.isExportDeclaration(statement)) {
      if (
        statement.moduleSpecifier ||
        statement.isTypeOnly ||
        !statement.exportClause ||
        !ts.isNamedExports(statement.exportClause)
      ) {
        continue;
      }

      for (const element of statement.exportClause.elements) {
        if (!element.isTypeOnly) {
          exportedBindingNames.add((element.propertyName ?? element.name).text);
        }
      }
      continue;
    }

    if (!ts.isExportAssignment(statement)) {
      continue;
    }

    let expression = statement.expression;
    while (ts.isParenthesizedExpression(expression)) {
      expression = expression.expression;
    }
    if (ts.isIdentifier(expression)) {
      exportedBindingNames.add(expression.text);
    }
  }

  const declarations: ts.VariableDeclaration[] = [];
  for (const name of exportedBindingNames) {
    const declaration = constDeclarations.get(name);
    if (declaration) {
      declarations.push(declaration);
    }
  }
  return declarations;
}

/** Finds exported helper-object bag errors. */
function toExportedHelperObjectBagErrors(
  filePath: string,
  sourceFile: ts.SourceFile,
  functionValuedBindings: ReadonlyMap<string, boolean>,
): string[] {
  if (RUNTIME_EXPORT_SURFACE_HELPER_OBJECT_BAG_ALLOWLIST.has(filePath)) {
    return [];
  }

  const errors: string[] = [];
  const exportedConstDeclarations = toExportedConstDeclarations(sourceFile);

  for (const declaration of exportedConstDeclarations) {
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
