/**
 * @fileoverview Implements is within line limit.
 */
/**
 * Checks whether within line limit.
 * @param source - Source parameter.
 * @param maxLines - Max lines parameter.
 * @example
 * isWithinLineLimit(source, maxLines)
 */ export function isWithinLineLimit(source: string, maxLines: number): boolean {
  const lineCount = source.split(/\r?\n/).length;
  return lineCount <= maxLines;
}
