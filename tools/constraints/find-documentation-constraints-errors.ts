/**
 * @fileoverview Finds documentation constraint violations in source files.
 */
import * as ts from "typescript";
import { findDocumentationConstraintsBindings } from "./find-documentation-constraints-bindings";
import { findDocumentationConstraintsJsdoc } from "./find-documentation-constraints-jsdoc";

/**
 * Handles find documentation constraints errors.
 * @param filePath - File path parameter.
 * @param source - Source parameter.
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
  }

  return errors;
}
