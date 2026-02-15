/**
 * @fileoverview Implements check constraints.
 */
import { readFile } from "node:fs/promises";
import { createLogger } from "../libs/logger/src/create-logger";
import { collectTargetFiles } from "./constraints/collect-target-files";
import { findDeprecatedUsageErrors } from "./constraints/find-deprecated-usage-errors";
import { findExportedFunctionTestErrors } from "./constraints/find-exported-function-test-errors";
import { findStandardsDriftErrors } from "./constraints/find-standards-drift-errors";
import { validateFileConstraints } from "./constraints/validate-file-constraints";

type FileSource = {
  filePath: string;
  source: string;
};

const TARGET_DIRECTORIES = ["apps", "libs", "tools"];
const TESTED_EXPORTS_ROOTS_ENV = "CONSTRAINT_TESTED_EXPORTS_ROOTS";
const DEFAULT_TESTED_EXPORTS_ROOTS = ["libs"];
const AGENTS_FILE_PATH = "AGENTS.md";
const README_FILE_PATH = "README.md";
const RUNTIME_EXPORT_SURFACE_FILE_PATH = "tools/constraints/find-runtime-export-surface-errors.ts";
const SRC_FUNCTION_DENSITY_FILE_PATH = "tools/constraints/find-src-function-density-errors.ts";
const VALIDATE_FILE_CONSTRAINTS_FILE_PATH = "tools/constraints/validate-file-constraints.ts";
const logger = createLogger({
  serviceName: "constraints",
});

/** Converts to tested export roots. */
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

/** Converts file sources to source map by path. */
function toSourceByPath(fileSources: FileSource[]): Map<string, string> {
  return new Map(fileSources.map((fileSource) => [fileSource.filePath, fileSource.source]));
}

/** Gets standards-drift errors between constraints and documentation. */
async function getStandardsDriftErrors(fileSources: FileSource[]): Promise<string[]> {
  const sourceByPath = toSourceByPath(fileSources);
  const runtimeExportSurfaceSource = sourceByPath.get(RUNTIME_EXPORT_SURFACE_FILE_PATH);
  const srcFunctionDensitySource = sourceByPath.get(SRC_FUNCTION_DENSITY_FILE_PATH);
  const validateFileConstraintsSource = sourceByPath.get(VALIDATE_FILE_CONSTRAINTS_FILE_PATH);

  if (!runtimeExportSurfaceSource) {
    return [
      `${RUNTIME_EXPORT_SURFACE_FILE_PATH}: source file is required for standards drift checks.`,
    ];
  }

  if (!srcFunctionDensitySource) {
    return [
      `${SRC_FUNCTION_DENSITY_FILE_PATH}: source file is required for standards drift checks.`,
    ];
  }

  if (!validateFileConstraintsSource) {
    return [
      `${VALIDATE_FILE_CONSTRAINTS_FILE_PATH}: source file is required for standards drift checks.`,
    ];
  }

  const agentsSource = await readFile(AGENTS_FILE_PATH, "utf8");
  const readmeSource = await readFile(README_FILE_PATH, "utf8");
  return findStandardsDriftErrors({
    agentsFilePath: AGENTS_FILE_PATH,
    agentsSource,
    readmeFilePath: README_FILE_PATH,
    readmeSource,
    runtimeExportSurfaceSource,
    srcFunctionDensitySource,
    validateFileConstraintsSource,
  });
}

/**
 * Runs constraint checks.
 * @example
 * await runConstraintChecks()
 * @returns Output value.
 */ export async function runConstraintChecks(): Promise<number> {
  const targetFiles = await collectTargetFiles(TARGET_DIRECTORIES);
  const fileSources = await toFileSources(targetFiles);
  const errors = [
    ...getPerFileConstraintErrors(fileSources),
    ...getCrossFileConstraintErrors(targetFiles, fileSources),
    ...(await getStandardsDriftErrors(fileSources)),
  ];

  if (errors.length === 0) {
    logger.info("Constraint check passed.");
    return 0;
  }

  logger.error("Constraint check failed");
  for (const error of errors) {
    logger.error(`- ${error}`);
  }
  return 1;
}

if (import.meta.main) {
  const exitCode = await runConstraintChecks();
  process.exit(exitCode);
}
