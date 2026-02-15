/**
 * @fileoverview Finds architecture and public-surface constraint violations for module imports/exports.
 */
import { findModuleConstraintsErrorsHelpers } from "./find-module-constraints-errors-helpers";

/**
 * Runs find module constraints errors.
 * @param filePath - File path parameter.
 * @param source - Source parameter.
 * @example
 * findModuleConstraintsErrors(filePath, source)
 * @returns Output value.
 */
export function findModuleConstraintsErrors(filePath: string, source: string): string[] {
  const { links, scope, sourceFile } = findModuleConstraintsErrorsHelpers.toModuleConstraintContext(
    filePath,
    source,
  );
  const errors = findModuleConstraintsErrorsHelpers.toExportStarErrors(filePath, sourceFile);
  if (!scope) {
    return errors;
  }

  for (const link of links) {
    const target = findModuleConstraintsErrorsHelpers.toTargetScope(filePath, link.moduleSpecifier);
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
