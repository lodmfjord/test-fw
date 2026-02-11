import { createRequire } from "node:module";
import { resolve } from "node:path";

export type ImportDescriptor = {
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
    // Keep bare imports when resolver cannot find them.
  }

  return moduleSpecifier;
}

export function toImportLines(
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
