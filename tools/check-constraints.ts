/**
 * @fileoverview CLI entry point that validates repository-wide file constraints.
 * Scans apps, libs, and tools for violations of naming, size, export, and documentation rules.
 */
import { readFile } from "node:fs/promises";
import { collectTargetFiles } from "./constraints/collect-target-files";
import { validateFileConstraints } from "./constraints/validate-file-constraints";

const TARGET_DIRECTORIES = ["apps", "libs", "tools"];

/** Gets constraint errors. */ async function getConstraintErrors(
  filePaths: string[],
): Promise<string[]> {
  const errors: string[] = [];

  for (const filePath of filePaths) {
    const source = await readFile(filePath, "utf8");
    errors.push(...validateFileConstraints(filePath, source));
  }

  return errors;
}

/**
 * Runs constraint checks.
 * @example
 * await runConstraintChecks()
 */ export async function runConstraintChecks(): Promise<number> {
  const targetFiles = await collectTargetFiles(TARGET_DIRECTORIES);
  const errors = await getConstraintErrors(targetFiles);

  if (errors.length === 0) {
    console.log("Constraint check passed.");
    return 0;
  }

  console.error("Constraint check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  return 1;
}

if (import.meta.main) {
  const exitCode = await runConstraintChecks();
  process.exit(exitCode);
}
