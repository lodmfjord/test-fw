/** @fileoverview Finds documentation constraint violations in source files. @module tools/constraints/find-documentation-constraints-errors */
import * as ts from "typescript";

type FunctionLikeBinding = {
  name: string;
  node: ts.FunctionDeclaration | ts.VariableStatement;
};

type NodeWithJsDoc = ts.Node & {
  jsDoc?: ts.NodeArray<ts.JSDoc>;
};

/** Converts values to source without shebang. */ function toSourceWithoutShebang(
  source: string,
): string {
  return source.replace(/^#!.*(?:\r?\n|$)/, "");
}

/** Checks whether has file level js doc. */ function hasFileLevelJsDoc(source: string): boolean {
  return toSourceWithoutShebang(source).trimStart().startsWith("/**");
}

/** Checks whether has modifier. */ function hasModifier(
  node: ts.Node & {
    modifiers?: ts.NodeArray<ts.ModifierLike>;
  },
  kind: ts.SyntaxKind,
): boolean {
  return node.modifiers?.some((modifier) => modifier.kind === kind) ?? false;
}

/** Checks whether has js doc. */ function hasJsDoc(node: ts.Node): boolean {
  const jsDocs = (node as NodeWithJsDoc).jsDoc;
  if (!jsDocs || jsDocs.length === 0) {
    return false;
  }

  return jsDocs.some((doc) => !/@fileoverview\b/.test(doc.getText()));
}

/** Checks whether has example tag. */ function hasExampleTag(node: ts.Node): boolean {
  const jsDocs = (node as NodeWithJsDoc).jsDoc;
  if (!jsDocs || jsDocs.length === 0) {
    return false;
  }

  for (const doc of jsDocs) {
    if (/@fileoverview\b/.test(doc.getText())) {
      continue;
    }

    const hasTypedTag = doc.tags?.some((tag) => tag.tagName.text === "example");
    if (hasTypedTag) {
      return true;
    }

    if (/@example\b/.test(doc.getText())) {
      return true;
    }
  }

  return false;
}

/** Converts values to function declaration binding. */ function toFunctionDeclarationBinding(
  node: ts.FunctionDeclaration,
): FunctionLikeBinding | undefined {
  if (!node.body) {
    return undefined;
  }

  const name = node.name?.text ?? "<default>";
  return {
    name,
    node,
  };
}

/** Converts values to variable statement binding. */ function toVariableStatementBinding(
  node: ts.VariableStatement,
): FunctionLikeBinding | undefined {
  const functionNames = node.declarationList.declarations.flatMap((declaration) => {
    if (!ts.isIdentifier(declaration.name) || !declaration.initializer) {
      return [];
    }

    if (
      !ts.isArrowFunction(declaration.initializer) &&
      !ts.isFunctionExpression(declaration.initializer)
    ) {
      return [];
    }

    return [declaration.name.text];
  });

  if (functionNames.length === 0) {
    return undefined;
  }

  return {
    name: functionNames.join(", "),
    node,
  };
}

/** Converts values to function bindings. */ function toFunctionBindings(
  sourceFile: ts.SourceFile,
): FunctionLikeBinding[] {
  const bindings: FunctionLikeBinding[] = [];

  /** Handles visit. */ function visit(node: ts.Node): void {
    if (ts.isFunctionDeclaration(node)) {
      const binding = toFunctionDeclarationBinding(node);
      if (binding) {
        bindings.push(binding);
      }
    }

    if (ts.isVariableStatement(node)) {
      const binding = toVariableStatementBinding(node);
      if (binding) {
        bindings.push(binding);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return bindings;
}

/** Finds documentation constraint errors. @example `findDocumentationConstraintsErrors("file.ts", source)` */
export function findDocumentationConstraintsErrors(filePath: string, source: string): string[] {
  const errors: string[] = [];

  if (!hasFileLevelJsDoc(source)) {
    errors.push(`${filePath}: file must start with a file-level JSDoc header.`);
  }

  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  for (const binding of toFunctionBindings(sourceFile)) {
    if (!hasJsDoc(binding.node)) {
      errors.push(`${filePath}: function "${binding.name}" is missing JSDoc.`);
      continue;
    }

    if (hasModifier(binding.node, ts.SyntaxKind.ExportKeyword) && !hasExampleTag(binding.node)) {
      errors.push(`${filePath}: exported function "${binding.name}" JSDoc must include @example.`);
    }
  }

  return errors;
}
