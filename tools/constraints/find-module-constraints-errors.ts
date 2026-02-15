/**
 * @fileoverview Finds architecture and public-surface constraint violations for module imports/exports.
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

/** Converts values to posix path. */ function toPosixPath(filePath: string): string {
  return filePath.split(sep).join("/");
}

/** Converts values to scope. */ function toScope(filePath: string): ModuleScope | undefined {
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

/** Converts values to relative target path. */ function toRelativeTargetPath(
  filePath: string,
  moduleSpecifier: string,
): string | undefined {
  if (!moduleSpecifier.startsWith(".")) {
    return undefined;
  }

  const joined = normalize(join(dirname(filePath), moduleSpecifier));
  return toPosixPath(joined);
}

/** Converts values to package target scope. */ function toPackageTargetScope(
  moduleSpecifier: string,
): ModuleScope | undefined {
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

/** Checks whether type only import. */ function isTypeOnlyImport(
  importClause: ts.ImportClause | undefined,
): boolean {
  if (!importClause) {
    return false;
  }

  if (importClause.isTypeOnly) {
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

/** Checks whether type only export. */ function isTypeOnlyExport(
  exportDeclaration: ts.ExportDeclaration,
): boolean {
  if (exportDeclaration.isTypeOnly) {
    return true;
  }

  if (!exportDeclaration.exportClause || !ts.isNamedExports(exportDeclaration.exportClause)) {
    return false;
  }

  return exportDeclaration.exportClause.elements.every((element) => element.isTypeOnly);
}

/** Converts values to module links. */ function toModuleLinks(
  sourceFile: ts.SourceFile,
): ModuleLink[] {
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

/** Converts values to target scope. */ function toTargetScope(
  filePath: string,
  moduleSpecifier: string,
): { scope: ModuleScope; hasDeepSrcPath: boolean } | undefined {
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

/** Converts values to export star errors. */ function toExportStarErrors(
  filePath: string,
  sourceFile: ts.SourceFile,
): string[] {
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

/**
 * Handles find module constraints errors.
 * @param filePath - File path parameter.
 * @param source - Source parameter.
 * @example
 * findModuleConstraintsErrors(filePath, source)
 */
export function findModuleConstraintsErrors(filePath: string, source: string): string[] {
  const scope = toScope(filePath);
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const errors = toExportStarErrors(filePath, sourceFile);

  if (!scope) {
    return errors;
  }

  for (const link of toModuleLinks(sourceFile)) {
    const target = toTargetScope(filePath, link.moduleSpecifier);
    if (!target) {
      continue;
    }

    const isCrossPackage =
      scope.root !== target.scope.root || scope.packageName !== target.scope.packageName;
    if (scope.root === "libs" && target.scope.root === "apps") {
      errors.push(`${filePath}: libs files cannot import from apps ("${link.moduleSpecifier}").`);
      continue;
    }

    if (
      scope.root === "apps" &&
      target.scope.root === "apps" &&
      scope.packageName !== target.scope.packageName &&
      !link.isTypeOnly
    ) {
      errors.push(
        `${filePath}: apps files cannot runtime-import from other apps ("${link.moduleSpecifier}"); use type-only imports.`,
      );
      continue;
    }

    if (!isCrossPackage || !target.hasDeepSrcPath) {
      continue;
    }

    const isAllowedTypeOnlyAppsImport =
      scope.root === "apps" &&
      target.scope.root === "apps" &&
      scope.packageName !== target.scope.packageName &&
      link.isTypeOnly;
    if (isAllowedTypeOnlyAppsImport) {
      continue;
    }

    errors.push(
      `${filePath}: deep cross-package src imports are not allowed ("${link.moduleSpecifier}"); import from the package entrypoint.`,
    );
  }

  return errors;
}
