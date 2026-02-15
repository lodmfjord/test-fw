/**
 * @fileoverview Implements check constraints.
 */
import { readFile } from "node:fs/promises";
import { collectTargetFiles } from "./constraints/collect-target-files";
import { findDeprecatedUsageErrors } from "./constraints/find-deprecated-usage-errors";
import { findExportedFunctionTestErrors } from "./constraints/find-exported-function-test-errors";
import { validateFileConstraints } from "./constraints/validate-file-constraints";

type FileSource = {
  filePath: string;
  source: string;
};

const TARGET_DIRECTORIES = ["apps", "libs", "tools"];
const TESTED_EXPORTS_ROOTS_ENV = "CONSTRAINT_TESTED_EXPORTS_ROOTS";
const DEFAULT_TESTED_EXPORTS_ROOTS = ["libs"];

/** Converts values to tested export roots. */
function toTestedExportRoots(): string[] {
  const configuredRoots = process.env[TESTED_EXPORTS_ROOTS_ENV];
  if (!configuredRoots) {
    return DEFAULT_TESTED_EXPORTS_ROOTS;
  }

  const roots = configuredRoots
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  if (roots.length === 0) {
    return DEFAULT_TESTED_EXPORTS_ROOTS;
  }

  return roots;
}

/** Converts file paths to file source records. */
async function toFileSources(filePaths: string[]): Promise<FileSource[]> {
  const fileSources: FileSource[] = [];

  for (const filePath of filePaths) {
    fileSources.push({
      filePath,
      source: await readFile(filePath, "utf8"),
    });
  }

  return fileSources;
}

/** Gets per-file constraint errors. */
function getPerFileConstraintErrors(fileSources: FileSource[]): string[] {
  const errors: string[] = [];

  for (const fileSource of fileSources) {
    errors.push(...validateFileConstraints(fileSource.filePath, fileSource.source));
  }

  return errors;
}

/** Gets cross-file constraint errors. */
function getCrossFileConstraintErrors(filePaths: string[], fileSources: FileSource[]): string[] {
  return [
    ...findDeprecatedUsageErrors(filePaths, "tsconfig.json"),
    ...findExportedFunctionTestErrors({
      fileSources,
      targetRoots: toTestedExportRoots(),
    }),
  ];
}

/**
 * Runs constraint checks.
 * @example
 * await runConstraintChecks()
 */ export async function runConstraintChecks(): Promise<number> {
  const targetFiles = await collectTargetFiles(TARGET_DIRECTORIES);
  const fileSources = await toFileSources(targetFiles);
  const errors = [
    ...getPerFileConstraintErrors(fileSources),
    ...getCrossFileConstraintErrors(targetFiles, fileSources),
  ];

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
