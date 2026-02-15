/**
 * @fileoverview Implements render used import lines.
 */
import {
  renderUsedImportLinesHelpers,
  type ImportDescriptor,
} from "./render-used-import-lines-helpers";

/** Converts to import lines. */
function toImportLines(handlerSource: string, imports: ImportDescriptor[]): string[] {
  const lines: string[] = [];
  const seen = new Set<string>();

  for (const item of imports) {
    if (item.sideEffectOnly) {
      const specifier = renderUsedImportLinesHelpers.resolveImportSpecifier(
        item.moduleSpecifier,
        item.sourcePath,
      );
      const line = `import ${JSON.stringify(specifier)};`;
      if (!seen.has(line)) {
        seen.add(line);
        lines.push(line);
      }
      continue;
    }

    const defaultImport =
      item.defaultImport &&
      renderUsedImportLinesHelpers.isNameUsed(handlerSource, item.defaultImport)
        ? item.defaultImport
        : undefined;
    const namespaceImport =
      item.namespaceImport &&
      renderUsedImportLinesHelpers.isNameUsed(handlerSource, item.namespaceImport)
        ? item.namespaceImport
        : undefined;
    const namedImports = item.namedImports.filter((entry) =>
      renderUsedImportLinesHelpers.isNameUsed(handlerSource, entry.local),
    );

    if (!defaultImport && !namespaceImport && namedImports.length === 0) {
      continue;
    }

    const parts: string[] = [];
    if (defaultImport) {
      parts.push(defaultImport);
    }
    if (namespaceImport) {
      parts.push(`* as ${namespaceImport}`);
    }
    if (namedImports.length > 0) {
      parts.push(
        `{ ${namedImports
          .map((entry) =>
            entry.imported === entry.local ? entry.imported : `${entry.imported} as ${entry.local}`,
          )
          .join(", ")} }`,
      );
    }

    const specifier = renderUsedImportLinesHelpers.resolveImportSpecifier(
      item.moduleSpecifier,
      item.sourcePath,
    );
    const line = `import ${parts.join(", ")} from ${JSON.stringify(specifier)};`;
    if (!seen.has(line)) {
      seen.add(line);
      lines.push(line);
    }
  }

  return lines;
}

/**
 * Runs render used import lines.
 * @param endpointModulePath - Endpoint module path parameter.
 * @param endpointModuleSource - Endpoint module source parameter.
 * @param handlerSource - Handler source parameter.
 * @example
 * renderUsedImportLines(endpointModulePath, endpointModuleSource, handlerSource)
 * @returns Output value.
 */
export function renderUsedImportLines(
  endpointModulePath: string,
  endpointModuleSource: string,
  handlerSource: string,
): string[] {
  const moduleImports = renderUsedImportLinesHelpers.toModuleImports(
    endpointModulePath,
    endpointModuleSource,
  );
  return toImportLines(handlerSource, moduleImports);
}
