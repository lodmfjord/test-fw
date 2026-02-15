/**
 * @fileoverview Finds documentation constraint violations in source files.
 */
import * as ts from "typescript";
import type { FunctionLikeBinding } from "./find-documentation-constraints-bindings";
import { findDocumentationConstraintsBindings } from "./find-documentation-constraints-bindings";
import { findDocumentationConstraintsJsdoc } from "./find-documentation-constraints-jsdoc";

const PLACEHOLDER_SUMMARY_PREFIXES = ["Handles ", "Converts values to "] as const;

/** Returns an explicit return type annotation when present. */
function toExplicitReturnTypeNode(binding: FunctionLikeBinding): ts.TypeNode | undefined {
  if (binding.functionNode.type) {
    return binding.functionNode.type;
  }

  if (
    binding.variableDeclaration?.type &&
    ts.isFunctionTypeNode(binding.variableDeclaration.type)
  ) {
    return binding.variableDeclaration.type.type;
  }

  return undefined;
}

/** Checks whether an explicit return type is `void` or `Promise<void>`. */
function hasExplicitVoidOrPromiseVoidReturnType(binding: FunctionLikeBinding): boolean {
  const returnTypeNode = toExplicitReturnTypeNode(binding);
  if (!returnTypeNode) {
    return false;
  }

  if (returnTypeNode.kind === ts.SyntaxKind.VoidKeyword) {
    return true;
  }

  if (!ts.isTypeReferenceNode(returnTypeNode)) {
    return false;
  }

  if (returnTypeNode.typeName.getText() !== "Promise") {
    return false;
  }

  const [firstTypeArgument] = returnTypeNode.typeArguments ?? [];
  return firstTypeArgument?.kind === ts.SyntaxKind.VoidKeyword;
}

/** Checks whether function body contains a throw statement excluding nested function bodies. */
function hasThrowInFunctionBody(functionNode: FunctionLikeBinding["functionNode"]): boolean {
  const { body } = functionNode;
  if (!body) {
    return false;
  }

  let hasThrow = false;

  /** Visits body nodes while skipping nested function bodies. */
  function visit(node: ts.Node): void {
    if (hasThrow) {
      return;
    }

    if (node !== body && ts.isFunctionLike(node)) {
      return;
    }

    if (ts.isThrowStatement(node)) {
      hasThrow = true;
      return;
    }

    ts.forEachChild(node, visit);
  }

  visit(body);
  return hasThrow;
}

/** Returns a placeholder summary prefix when detected. */
function toPlaceholderSummaryPrefix(
  summaryText: string,
): (typeof PLACEHOLDER_SUMMARY_PREFIXES)[number] | undefined {
  const normalizedSummary = summaryText.trimStart().toLowerCase();

  return PLACEHOLDER_SUMMARY_PREFIXES.find((prefix) =>
    normalizedSummary.startsWith(prefix.toLowerCase()),
  );
}

/**
 * Finds documentation constraints errors.
 * @param filePath - File path parameter.
 * @param source - Source parameter.
 * @returns Collected documentation constraint errors.
 * @example
 * findDocumentationConstraintsErrors(filePath, source)
 */
export function findDocumentationConstraintsErrors(filePath: string, source: string): string[] {
  const errors: string[] = [];
  const fileLevelJsDoc = findDocumentationConstraintsJsdoc.toFileLevelJsDocText(source);

  if (!fileLevelJsDoc) {
    errors.push(`${filePath}: file must start with a file-level JSDoc header.`);
  } else {
    if (!/@fileoverview\b/.test(fileLevelJsDoc)) {
      errors.push(`${filePath}: file-level JSDoc header must include "@fileoverview".`);
    }
    if (/@module\b/.test(fileLevelJsDoc)) {
      errors.push(`${filePath}: file-level JSDoc header must not include "@module".`);
    }
    if (!findDocumentationConstraintsJsdoc.isMultilineJsDocText(fileLevelJsDoc)) {
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

  for (const binding of findDocumentationConstraintsBindings.toFunctionBindings(sourceFile)) {
    const jsDoc = findDocumentationConstraintsJsdoc.toPrimaryJsDoc(binding.node);
    if (!jsDoc || !findDocumentationConstraintsJsdoc.hasFunctionJsDoc(binding.node)) {
      errors.push(`${filePath}: function "${binding.name}" is missing JSDoc.`);
      continue;
    }

    const placeholderSummaryPrefix = toPlaceholderSummaryPrefix(
      findDocumentationConstraintsJsdoc.toSummaryText(jsDoc),
    );
    if (placeholderSummaryPrefix) {
      errors.push(
        `${filePath}: function "${binding.name}" JSDoc summary must not start with "${placeholderSummaryPrefix}".`,
      );
    }

    if (!binding.exported) {
      continue;
    }

    if (!findDocumentationConstraintsJsdoc.isMultilineJsDocText(jsDoc.getText())) {
      errors.push(
        `${filePath}: exported function "${binding.name}" JSDoc must use multiline JSDoc format.`,
      );
    }
    if (!findDocumentationConstraintsJsdoc.hasExampleTag(jsDoc)) {
      errors.push(`${filePath}: exported function "${binding.name}" JSDoc must include @example.`);
    }

    const paramTagsByName = findDocumentationConstraintsJsdoc.toParamTagsByName(jsDoc);
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

      if (findDocumentationConstraintsJsdoc.toCommentText(paramTag.comment).length === 0) {
        errors.push(
          `${filePath}: exported function "${binding.name}" JSDoc @param "${paramName}" must include a description.`,
        );
      }
    }

    if (
      !hasExplicitVoidOrPromiseVoidReturnType(binding) &&
      !findDocumentationConstraintsJsdoc.hasReturnsTag(jsDoc)
    ) {
      errors.push(`${filePath}: exported function "${binding.name}" JSDoc must include @returns.`);
    }

    if (
      hasThrowInFunctionBody(binding.functionNode) &&
      !findDocumentationConstraintsJsdoc.hasThrowsTag(jsDoc)
    ) {
      errors.push(
        `${filePath}: exported function "${binding.name}" JSDoc must include @throws when function throws.`,
      );
    }
  }

  return errors;
}
