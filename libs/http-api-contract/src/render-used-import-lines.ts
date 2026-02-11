import { createRequire } from "node:module";
import { resolve } from "node:path";
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
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isLocalImportPath(value: string): boolean {
  return value.startsWith("./") || value.startsWith("../");
}

function isNameUsed(handlerSource: string, name: string): boolean {
  return new RegExp(`\\b${escapeRegExp(name)}\\b`, "m").test(handlerSource);
}

function resolveImportSpecifier(moduleSpecifier: string, endpointModulePath: string): string {
  if (isLocalImportPath(moduleSpecifier)) {
    return resolve(endpointModulePath, "..", moduleSpecifier);
  }

  try {
    const requireFromEndpoint = createRequire(endpointModulePath);
    return requireFromEndpoint.resolve(moduleSpecifier);
  } catch {
    return moduleSpecifier;
  }
}

function toImportDescriptor(statement: ts.ImportDeclaration): ImportDescriptor | null {
  const moduleSpecifierNode = statement.moduleSpecifier;
  if (!ts.isStringLiteral(moduleSpecifierNode)) {
    return null;
  }

  const moduleSpecifier = moduleSpecifierNode.text.trim();
  if (moduleSpecifier.length === 0 || moduleSpecifier === "@simple-api/http-api-contract") {
    return null;
  }

  const clause = statement.importClause;
  if (!clause) {
    return {
      moduleSpecifier,
      namedImports: [],
      sideEffectOnly: true,
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

function toModuleImports(endpointModulePath: string, moduleSource: string): ImportDescriptor[] {
  const sourceFile = ts.createSourceFile(
    endpointModulePath,
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

    const descriptor = toImportDescriptor(statement);
    if (descriptor) {
      imports.push(descriptor);
    }
  }

  return imports;
}

function toImportLines(
  endpointModulePath: string,
  handlerSource: string,
  imports: ImportDescriptor[],
): string[] {
  const lines: string[] = [];

  for (const item of imports) {
    if (item.sideEffectOnly) {
      const specifier = resolveImportSpecifier(item.moduleSpecifier, endpointModulePath);
      lines.push(`import ${JSON.stringify(specifier)};`);
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

    const specifier = resolveImportSpecifier(item.moduleSpecifier, endpointModulePath);
    lines.push(`import ${parts.join(", ")} from ${JSON.stringify(specifier)};`);
  }

  return lines;
}

export function renderUsedImportLines(
  endpointModulePath: string,
  endpointModuleSource: string,
  handlerSource: string,
): string[] {
  const moduleImports = toModuleImports(endpointModulePath, endpointModuleSource);
  return toImportLines(endpointModulePath, handlerSource, moduleImports);
}
