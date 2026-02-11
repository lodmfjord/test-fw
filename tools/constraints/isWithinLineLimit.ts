export function isWithinLineLimit(source: string, maxLines: number): boolean {
  const lineCount = source.split(/\r?\n/).length;
  return lineCount <= maxLines;
}
