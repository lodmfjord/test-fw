/** @fileoverview Implements is within line limit. @module tools/constraints/is-within-line-limit */
/** Checks whether within line limit. @example `isWithinLineLimit(input)` */ export function isWithinLineLimit(
  source: string,
  maxLines: number,
): boolean {
  const lineCount = source.split(/\r?\n/).length;
  return lineCount <= maxLines;
}
