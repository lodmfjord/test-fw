/**
 * @fileoverview Finds documentation constraint violations in source files.
 */
import * as ts from "typescript";

type FunctionLikeBinding = {
  exported: boolean;
  name: string;
  node: ts.FunctionDeclaration | ts.VariableStatement;
  parameters: ts.NodeArray<ts.ParameterDeclaration>;
};

type NodeWithJsDoc = ts.Node & {
  jsDoc?: ts.NodeArray<ts.JSDoc>;
};

/**
 * Removes an optional shebang from source text.
 *
 * @param source - File source text.
 * @returns Source text without shebang.
 */
function toSourceWithoutShebang(source: string): string {
  return source.replace(/^#!.*(?:\r?\n|$)/, "");
}

/**
 * Returns the first JSDoc block at file start.
 *
 * @param source - File source text.
 * @returns File-level JSDoc text when present.
 */
function toFileLevelJsDocText(source: string): string | undefined {
  const sourceWithoutShebang = toSourceWithoutShebang(source);
  const match = sourceWithoutShebang.match(/^\s*\/\*\*[\s\S]*?\*\//);
  return match?.[0];
}

/**
 * Checks whether a JSDoc block uses multiline format.
 *
 * @param jsDocText - Raw JSDoc text.
 * @returns True when the block has at least one line break.
 */
function isMultilineJsDocText(jsDocText: string): boolean {
  return /\r?\n/.test(jsDocText);
}

/**
 * Checks whether a node has a given modifier.
 *
 * @param node - AST node.
 * @param kind - Modifier kind.
 * @returns True when the modifier exists.
 */
function hasModifier(
  node: ts.Node & {
    modifiers?: ts.NodeArray<ts.ModifierLike>;
  },
  kind: ts.SyntaxKind,
): boolean {
  return node.modifiers?.some((modifier) => modifier.kind === kind) ?? false;
}

/**
 * Returns non-file-level JSDoc blocks attached to a node.
 *
 * @param node - AST node.
 * @returns Effective node JSDoc blocks.
 */
function toEffectiveJsDocs(node: ts.Node): ts.JSDoc[] {
  const jsDocs = (node as NodeWithJsDoc).jsDoc;
  if (!jsDocs || jsDocs.length === 0) {
    return [];
  }

  return jsDocs.filter((doc) => !/@fileoverview\b/.test(doc.getText()));
}

/**
 * Returns the JSDoc block used for function validation.
 *
 * @param node - AST node.
 * @returns The closest effective JSDoc block.
 */
function toPrimaryJsDoc(node: ts.Node): ts.JSDoc | undefined {
  const docs = toEffectiveJsDocs(node);
  return docs.length > 0 ? docs[docs.length - 1] : undefined;
}

/**
 * Checks whether a node has a non-file-level JSDoc block.
 *
 * @param node - AST node.
 * @returns True when function JSDoc exists.
 */
function hasFunctionJsDoc(node: ts.Node): boolean {
  return Boolean(toPrimaryJsDoc(node));
}

/**
 * Converts JSDoc comment payload to plain text.
 *
 * @param comment - JSDoc tag comment value.
 * @returns Trimmed plain text.
 */
function toCommentText(comment: string | ts.NodeArray<ts.JSDocComment> | undefined): string {
  if (!comment) {
    return "";
  }

  if (typeof comment === "string") {
    return comment.trim();
  }

  return comment
    .map((part) => (typeof part === "string" ? part : part.getText()))
    .join("")
    .trim();
}

/**
 * Returns `@param` tags by parameter name.
 *
 * @param jsDoc - Function JSDoc block.
 * @returns Parameter tags map.
 */
function toParamTagsByName(jsDoc: ts.JSDoc): Map<string, ts.JSDocParameterTag> {
  const tags = jsDoc.tags ?? [];
  const byName = new Map<string, ts.JSDocParameterTag>();

  for (const tag of tags) {
    if (tag.tagName.text !== "param" || !ts.isJSDocParameterTag(tag)) {
      continue;
    }

    byName.set(tag.name.getText(), tag);
  }

  return byName;
}

/**
 * Checks whether function JSDoc includes `@example`.
 *
 * @param jsDoc - Function JSDoc block.
 * @returns True when `@example` exists.
 */
function hasExampleTag(jsDoc: ts.JSDoc): boolean {
  const hasTypedTag = jsDoc.tags?.some((tag) => tag.tagName.text === "example") ?? false;
  if (hasTypedTag) {
    return true;
  }

  return /@example\b/.test(jsDoc.getText());
}

/**
 * Collects function-like bindings from a source file.
 *
 * @param sourceFile - TypeScript source file.
 * @returns Function-like bindings.
 */
function toFunctionBindings(sourceFile: ts.SourceFile): FunctionLikeBinding[] {
  const bindings: FunctionLikeBinding[] = [];

  /**
   * Visits AST nodes and collects function-like bindings.
   *
   * @param node - AST node.
   */
  function visit(node: ts.Node): void {
    if (ts.isFunctionDeclaration(node) && node.body) {
      bindings.push({
        exported: hasModifier(node, ts.SyntaxKind.ExportKeyword),
        name: node.name?.text ?? "<default>",
        node,
        parameters: node.parameters,
      });
    }

    if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || !declaration.initializer) {
          continue;
        }

        if (
          !ts.isArrowFunction(declaration.initializer) &&
          !ts.isFunctionExpression(declaration.initializer)
        ) {
          continue;
        }

        bindings.push({
          exported: hasModifier(node, ts.SyntaxKind.ExportKeyword),
          name: declaration.name.text,
          node,
          parameters: declaration.initializer.parameters,
        });
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return bindings;
}

/**
 * Handles find documentation constraints errors.
 * @param filePath - File path parameter.
 * @param source - Source parameter.
 * @example
 * findDocumentationConstraintsErrors(filePath, source)
 */
export function findDocumentationConstraintsErrors(filePath: string, source: string): string[] {
  const errors: string[] = [];
  const fileLevelJsDoc = toFileLevelJsDocText(source);

  if (!fileLevelJsDoc) {
    errors.push(`${filePath}: file must start with a file-level JSDoc header.`);
  } else {
    if (!/@fileoverview\b/.test(fileLevelJsDoc)) {
      errors.push(`${filePath}: file-level JSDoc header must include "@fileoverview".`);
    }

    if (/@module\b/.test(fileLevelJsDoc)) {
      errors.push(`${filePath}: file-level JSDoc header must not include "@module".`);
    }

    if (!isMultilineJsDocText(fileLevelJsDoc)) {
      errors.push(`${filePath}: file-level JSDoc header must use multiline JSDoc format.`);
    }
  }

  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  for (const binding of toFunctionBindings(sourceFile)) {
    const jsDoc = toPrimaryJsDoc(binding.node);
    if (!jsDoc || !hasFunctionJsDoc(binding.node)) {
      errors.push(`${filePath}: function "${binding.name}" is missing JSDoc.`);
      continue;
    }

    if (!binding.exported) {
      continue;
    }

    if (!isMultilineJsDocText(jsDoc.getText())) {
      errors.push(
        `${filePath}: exported function "${binding.name}" JSDoc must use multiline JSDoc format.`,
      );
    }

    if (!hasExampleTag(jsDoc)) {
      errors.push(`${filePath}: exported function "${binding.name}" JSDoc must include @example.`);
    }

    const paramTagsByName = toParamTagsByName(jsDoc);
    for (const parameter of binding.parameters) {
      if (!ts.isIdentifier(parameter.name)) {
        if (paramTagsByName.size === 0) {
          errors.push(
            `${filePath}: exported function "${binding.name}" JSDoc must document parameters with @param tags.`,
          );
        }
        continue;
      }

      const paramName = parameter.name.text;
      const paramTag = paramTagsByName.get(paramName);
      if (!paramTag) {
        errors.push(
          `${filePath}: exported function "${binding.name}" JSDoc is missing @param "${paramName}".`,
        );
        continue;
      }

      if (toCommentText(paramTag.comment).length === 0) {
        errors.push(
          `${filePath}: exported function "${binding.name}" JSDoc @param "${paramName}" must include a description.`,
        );
      }
    }
  }

  return errors;
}
