/**
 * @fileoverview Implements JSDoc helpers for documentation constraints.
 */
import * as ts from "typescript";

type NodeWithJsDoc = ts.Node & {
  jsDoc?: ts.NodeArray<ts.JSDoc>;
};

/** Removes an optional shebang from source text. */
function toSourceWithoutShebang(source: string): string {
  return source.replace(/^#!.*(?:\r?\n|$)/, "");
}

/** Returns the first JSDoc block at file start. */
function toFileLevelJsDocText(source: string): string | undefined {
  const sourceWithoutShebang = toSourceWithoutShebang(source);
  const match = sourceWithoutShebang.match(/^\s*\/\*\*[\s\S]*?\*\//);
  return match?.[0];
}

/** Checks whether a JSDoc block uses multiline format. */
function isMultilineJsDocText(jsDocText: string): boolean {
  return /\r?\n/.test(jsDocText);
}

/** Returns non-file-level JSDoc blocks attached to a node. */
function toEffectiveJsDocs(node: ts.Node): ts.JSDoc[] {
  const jsDocs = (node as NodeWithJsDoc).jsDoc;
  if (!jsDocs || jsDocs.length === 0) {
    return [];
  }

  return jsDocs.filter((doc) => !/@fileoverview\b/.test(doc.getText()));
}

/** Returns the JSDoc block used for function validation. */
function toPrimaryJsDoc(node: ts.Node): ts.JSDoc | undefined {
  const docs = toEffectiveJsDocs(node);
  return docs.length > 0 ? docs[docs.length - 1] : undefined;
}

/** Checks whether a node has a non-file-level JSDoc block. */
function hasFunctionJsDoc(node: ts.Node): boolean {
  return Boolean(toPrimaryJsDoc(node));
}

/** Converts JSDoc comment payload to plain text. */
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

/** Returns `@param` tags by parameter name. */
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

/** Checks whether function JSDoc includes `@example`. */
function hasExampleTag(jsDoc: ts.JSDoc): boolean {
  return hasTag(jsDoc, "example");
}

/** Checks whether function JSDoc includes `@returns`. */
function hasReturnsTag(jsDoc: ts.JSDoc): boolean {
  return hasTag(jsDoc, "returns");
}

/** Checks whether function JSDoc includes `@throws`. */
function hasThrowsTag(jsDoc: ts.JSDoc): boolean {
  return hasTag(jsDoc, "throws");
}

/** Returns summary text from the first sentence or text line before tags. */
function toSummaryText(jsDoc: ts.JSDoc): string {
  const commentText = toCommentText(jsDoc.comment);
  if (commentText.length === 0) {
    return "";
  }

  const firstSummaryLine = commentText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!firstSummaryLine) {
    return "";
  }

  const sentenceMatch = firstSummaryLine.match(/^(.+?[.!?])(?:\s|$)/);
  return (sentenceMatch?.[1] ?? firstSummaryLine).trim();
}

/** Checks whether JSDoc contains a tag by name. */
function hasTag(jsDoc: ts.JSDoc, tagName: string): boolean {
  const hasTypedTag = jsDoc.tags?.some((tag) => tag.tagName.text === tagName) ?? false;
  if (hasTypedTag) {
    return true;
  }

  return new RegExp(`@${tagName}\\b`).test(jsDoc.getText());
}

const findDocumentationConstraintsJsdoc = {
  hasExampleTag,
  hasFunctionJsDoc,
  hasReturnsTag,
  hasThrowsTag,
  isMultilineJsDocText,
  toCommentText,
  toFileLevelJsDocText,
  toParamTagsByName,
  toPrimaryJsDoc,
  toSummaryText,
};

export { findDocumentationConstraintsJsdoc };
