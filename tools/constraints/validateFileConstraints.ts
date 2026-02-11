import { countExportedFunctions } from "./countExportedFunctions";
import { isWithinLineLimit } from "./isWithinLineLimit";

const MAX_EXPORTED_FUNCTIONS = 1;
const MAX_LINES = 300;

export function validateFileConstraints(filePath: string, source: string): string[] {
  const errors: string[] = [];
  const exportCount = countExportedFunctions(source);
  const lineCount = source.split(/\r?\n/).length;

  if (exportCount > MAX_EXPORTED_FUNCTIONS) {
    errors.push(
      `${filePath}: has ${exportCount} exported functions (max ${MAX_EXPORTED_FUNCTIONS}).`,
    );
  }

  if (!isWithinLineLimit(source, MAX_LINES)) {
    errors.push(`${filePath}: has ${lineCount} lines (max ${MAX_LINES}).`);
  }

  return errors;
}
