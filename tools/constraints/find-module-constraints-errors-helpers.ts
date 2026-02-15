/**
 * @fileoverview Implements module-constraint helper utilities.
 */
import { dirname, join, normalize, sep } from "node:path";
import * as ts from "typescript";

type ModuleScope = {
  packageName: string;
  root: "apps" | "libs";
};

type ModuleLink = {
  isTypeOnly: boolean;
  moduleSpecifier: string;
};

type ModuleTarget = {
  hasDeepSrcPath: boolean;
  scope: ModuleScope;
};

/** Converts to posix path. */
function toPosixPath(filePath: string): string {
  return filePath.split(sep).join("/");
}

/** Converts to scope. */
function toScope(filePath: string): ModuleScope | undefined {
  const normalized = toPosixPath(filePath);
  const parts = normalized.split("/");
  if (parts.length < 2) {
    return undefined;
  }

  const [root, packageName] = parts;
  if ((root !== "apps" && root !== "libs") || !packageName) {
    return undefined;
  }

  return { root, packageName };
}

/** Converts to relative target path. */
function toRelativeTargetPath(filePath: string, moduleSpecifier: string): string | undefined {
  if (!moduleSpecifier.startsWith(".")) {
    return undefined;
  }

  const joined = normalize(join(dirname(filePath), moduleSpecifier));
  return toPosixPath(joined);
}

/** Converts to package target scope. */
function toPackageTargetScope(moduleSpecifier: string): ModuleScope | undefined {
  const match = /^@babbstack\/([^/]+)(?:\/(.*))?$/.exec(moduleSpecifier);
  if (!match) {
    return undefined;
  }

  const packageName = match[1];
  const packageTail = match[2];
  if (!packageName) {
    return undefined;
  }

  if (packageTail?.startsWith("src/")) {
    return { root: "libs", packageName };
  }

  return undefined;
}

/** Checks whether type only import. */
function isTypeOnlyImport(importClause: ts.ImportClause | undefined): boolean {
  if (!importClause) {
    return false;
  }

  if (importClause.phaseModifier === ts.SyntaxKind.TypeKeyword) {
    return true;
  }

  if (importClause.name || !importClause.namedBindings) {
    return false;
  }

  if (!ts.isNamedImports(importClause.namedBindings)) {
    return false;
  }

  return importClause.namedBindings.elements.every((element) => element.isTypeOnly);
}

/** Checks whether type only export. */
function isTypeOnlyExport(exportDeclaration: ts.ExportDeclaration): boolean {
  if (exportDeclaration.isTypeOnly) {
    return true;
  }

  if (!exportDeclaration.exportClause || !ts.isNamedExports(exportDeclaration.exportClause)) {
    return false;
  }

  return exportDeclaration.exportClause.elements.every((element) => element.isTypeOnly);
}

/** Converts to module links. */
function toModuleLinks(sourceFile: ts.SourceFile): ModuleLink[] {
  const links: ModuleLink[] = [];

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      if (!ts.isStringLiteral(statement.moduleSpecifier)) {
        continue;
      }

      links.push({
        isTypeOnly: isTypeOnlyImport(statement.importClause),
        moduleSpecifier: statement.moduleSpecifier.text,
      });
      continue;
    }

    if (!ts.isExportDeclaration(statement) || !statement.moduleSpecifier) {
      continue;
    }
    if (!ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }

    links.push({
      isTypeOnly: isTypeOnlyExport(statement),
      moduleSpecifier: statement.moduleSpecifier.text,
    });
  }

  return links;
}

/** Converts to target scope. */
function toTargetScope(filePath: string, moduleSpecifier: string): ModuleTarget | undefined {
  const relativeTargetPath = toRelativeTargetPath(filePath, moduleSpecifier);
  if (relativeTargetPath) {
    const scope = toScope(relativeTargetPath);
    if (!scope) {
      return undefined;
    }
    return { hasDeepSrcPath: relativeTargetPath.includes("/src/"), scope };
  }

  const packageScope = toPackageTargetScope(moduleSpecifier);
  if (packageScope) {
    return { hasDeepSrcPath: true, scope: packageScope };
  }

  const directScope = toScope(moduleSpecifier);
  if (!directScope) {
    return undefined;
  }

  return { hasDeepSrcPath: moduleSpecifier.includes("/src/"), scope: directScope };
}

/** Converts to export star errors. */
function toExportStarErrors(filePath: string, sourceFile: ts.SourceFile): string[] {
  const errors: string[] = [];

  for (const statement of sourceFile.statements) {
    if (
      !ts.isExportDeclaration(statement) ||
      !statement.moduleSpecifier ||
      statement.exportClause
    ) {
      continue;
    }

    if (!ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }

    errors.push(
      `${filePath}: export * is not allowed ("${statement.moduleSpecifier.text}"); use explicit named exports.`,
    );
  }

  return errors;
}

/** Converts to module constraint context. */
function toModuleConstraintContext(
  filePath: string,
  source: string,
): {
  links: ModuleLink[];
  scope: ModuleScope | undefined;
  sourceFile: ts.SourceFile;
} {
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  return {
    links: toModuleLinks(sourceFile),
    scope: toScope(filePath),
    sourceFile,
  };
}

const findModuleConstraintsErrorsHelpers = {
  toExportStarErrors,
  toModuleConstraintContext,
  toTargetScope,
};

export { findModuleConstraintsErrorsHelpers };
