/**
 * @fileoverview Implements render used import lines.
 */
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { extname, resolve } from "node:path";
import * as ts from "typescript";

type ImportDescriptor = {
  defaultImport?: string;
  moduleSpecifier: string;
  namedImports: Array<{
    imported: string;
    local: string;
  }>;
  namespaceImport?: string;
  sideEffectOnly: boolean;
  sourcePath: string;
};

const LOCAL_SOURCE_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts", ".js", ".mjs", ".cjs"];

/** Handles escape reg exp. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Checks whether local import path. */
function isLocalImportPath(value: string): boolean {
  return value.startsWith("./") || value.startsWith("../");
}

/** Checks whether name used. */
function isNameUsed(handlerSource: string, name: string): boolean {
  return new RegExp(`\\b${escapeRegExp(name)}\\b`, "m").test(handlerSource);
}

/** Converts values to resolved local module path. */
function toResolvedLocalModulePath(
  importerPath: string,
  moduleSpecifier: string,
): string | undefined {
  const basePath = resolve(importerPath, "..", moduleSpecifier);
  const hasKnownExtension = LOCAL_SOURCE_EXTENSIONS.includes(extname(basePath));
  const candidates = hasKnownExtension
    ? [basePath]
    : [
        ...LOCAL_SOURCE_EXTENSIONS.map((extension) => `${basePath}${extension}`),
        ...LOCAL_SOURCE_EXTENSIONS.map((extension) => resolve(basePath, `index${extension}`)),
      ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

/** Handles resolve import specifier. */
function resolveImportSpecifier(moduleSpecifier: string, importerPath: string): string {
  if (isLocalImportPath(moduleSpecifier)) {
    return (
      toResolvedLocalModulePath(importerPath, moduleSpecifier) ??
      resolve(importerPath, "..", moduleSpecifier)
    );
  }

  try {
    const requireFromEndpoint = createRequire(importerPath);
    return requireFromEndpoint.resolve(moduleSpecifier);
  } catch {
    return moduleSpecifier;
  }
}

/** Converts values to import descriptor. */
function toImportDescriptor(
  statement: ts.ImportDeclaration,
  sourcePath: string,
): ImportDescriptor | null {
  const moduleSpecifierNode = statement.moduleSpecifier;
  if (!ts.isStringLiteral(moduleSpecifierNode)) {
    return null;
  }

  const moduleSpecifier = moduleSpecifierNode.text.trim();
  if (moduleSpecifier.length === 0 || moduleSpecifier === "@babbstack/http-api-contract") {
    return null;
  }

  const clause = statement.importClause;
  if (!clause) {
    return {
      moduleSpecifier,
      namedImports: [],
      sideEffectOnly: true,
      sourcePath,
    };
  }

  if (clause.isTypeOnly) {
    return null;
  }

  const descriptor: ImportDescriptor = {
    ...(clause.name ? { defaultImport: clause.name.text } : {}),
    moduleSpecifier,
    namedImports: [],
    sideEffectOnly: false,
    sourcePath,
  };
  const bindings = clause.namedBindings;
  if (!bindings) {
    return descriptor;
  }

  if (ts.isNamespaceImport(bindings)) {
    descriptor.namespaceImport = bindings.name.text;
    return descriptor;
  }

  for (const element of bindings.elements) {
    if (element.isTypeOnly) {
      continue;
    }

    descriptor.namedImports.push({
      imported: element.propertyName ? element.propertyName.text : element.name.text,
      local: element.name.text,
    });
  }

  return descriptor;
}

/** Converts values to imports for source. */
function toImportsForSource(sourcePath: string, moduleSource: string): ImportDescriptor[] {
  const sourceFile = ts.createSourceFile(
    sourcePath,
    moduleSource,
    ts.ScriptTarget.ESNext,
    true,
    ts.ScriptKind.TS,
  );
  const imports: ImportDescriptor[] = [];

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) {
      continue;
    }

    const descriptor = toImportDescriptor(statement, sourcePath);
    if (descriptor) {
      imports.push(descriptor);
    }
  }

  return imports;
}

/** Converts values to module imports. */
function toModuleImports(endpointModulePath: string, moduleSource: string): ImportDescriptor[] {
  const visited = new Set<string>();
  const queue: Array<{ path: string; source: string }> = [
    { path: endpointModulePath, source: moduleSource },
  ];
  const imports: ImportDescriptor[] = [];

  while (queue.length > 0) {
    const next = queue.shift();
    if (!next || visited.has(next.path)) {
      continue;
    }

    visited.add(next.path);
    const moduleImports = toImportsForSource(next.path, next.source);
    imports.push(...moduleImports);

    for (const descriptor of moduleImports) {
      if (!isLocalImportPath(descriptor.moduleSpecifier)) {
        continue;
      }

      const resolvedPath = toResolvedLocalModulePath(next.path, descriptor.moduleSpecifier);
      if (!resolvedPath || visited.has(resolvedPath)) {
        continue;
      }

      try {
        queue.push({
          path: resolvedPath,
          source: readFileSync(resolvedPath, "utf8"),
        });
      } catch {}
    }
  }

  return imports;
}

/** Converts values to import lines. */
function toImportLines(handlerSource: string, imports: ImportDescriptor[]): string[] {
  const lines: string[] = [];
  const seen = new Set<string>();

  for (const item of imports) {
    if (item.sideEffectOnly) {
      const specifier = resolveImportSpecifier(item.moduleSpecifier, item.sourcePath);
      const line = `import ${JSON.stringify(specifier)};`;
      if (!seen.has(line)) {
        seen.add(line);
        lines.push(line);
      }
      continue;
    }

    const defaultImport =
      item.defaultImport && isNameUsed(handlerSource, item.defaultImport)
        ? item.defaultImport
        : undefined;
    const namespaceImport =
      item.namespaceImport && isNameUsed(handlerSource, item.namespaceImport)
        ? item.namespaceImport
        : undefined;
    const namedImports = item.namedImports.filter((entry) =>
      isNameUsed(handlerSource, entry.local),
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

    const specifier = resolveImportSpecifier(item.moduleSpecifier, item.sourcePath);
    const line = `import ${parts.join(", ")} from ${JSON.stringify(specifier)};`;
    if (!seen.has(line)) {
      seen.add(line);
      lines.push(line);
    }
  }

  return lines;
}

/**
 * Handles render used import lines.
 * @param endpointModulePath - Endpoint module path parameter.
 * @param endpointModuleSource - Endpoint module source parameter.
 * @param handlerSource - Handler source parameter.
 * @example
 * renderUsedImportLines(endpointModulePath, endpointModuleSource, handlerSource)
 */
export function renderUsedImportLines(
  endpointModulePath: string,
  endpointModuleSource: string,
  handlerSource: string,
): string[] {
  const moduleImports = toModuleImports(endpointModulePath, endpointModuleSource);
  return toImportLines(handlerSource, moduleImports);
}
