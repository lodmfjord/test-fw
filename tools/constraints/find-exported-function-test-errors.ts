/**
 * @fileoverview Finds exported function files without colocated test files.
 */
import { basename, dirname, extname, join } from "node:path";
import { countExportedFunctions } from "./count-exported-functions";

type FileSource = {
  filePath: string;
  source: string;
};

type FindExportedFunctionTestErrorsInput = {
  fileSources: FileSource[];
  targetRoots?: string[];
  allowedUntestedFilePaths?: ReadonlySet<string>;
};

const SOURCE_FILE_EXTENSION_PATTERN = /\.(?:[cm]?[jt]sx?)$/;
const TEST_FILE_EXTENSION_PATTERN = /\.test\.(?:[cm]?[jt]sx?)$/;
const DEFAULT_TARGET_ROOTS = ["libs"];

/** Checks whether a source file path should be validated. */
function shouldValidateFilePath(filePath: string, targetRoots: Set<string>): boolean {
  const rootDirectory = filePath.split("/")[0] ?? "";
  if (!targetRoots.has(rootDirectory)) {
    return false;
  }

  if (!filePath.includes("/src/")) {
    return false;
  }

  if (!SOURCE_FILE_EXTENSION_PATTERN.test(filePath)) {
    return false;
  }

  if (filePath.endsWith(".d.ts")) {
    return false;
  }

  if (TEST_FILE_EXTENSION_PATTERN.test(filePath)) {
    return false;
  }

  return true;
}

/** Converts to expected sibling test file path. */
function toSiblingTestFilePath(filePath: string): string {
  const extension = extname(filePath);
  const directory = dirname(filePath);
  const fileName = basename(filePath, extension);
  return join(directory, `${fileName}.test${extension}`);
}

/**
 * Finds errors for exported-function files missing colocated tests.
 * @param input - Constraint input.
 * @example
 * findExportedFunctionTestErrors({
 *   fileSources: [{ filePath: "libs/example/src/do-work.ts", source: "export function doWork() {}" }],
 * })
 * @returns Output value.
 */
export function findExportedFunctionTestErrors(
  input: FindExportedFunctionTestErrorsInput,
): string[] {
  const targetRoots = new Set(input.targetRoots ?? DEFAULT_TARGET_ROOTS);
  const allowedUntestedFilePaths = input.allowedUntestedFilePaths ?? new Set<string>();
  const filePathSet = new Set(input.fileSources.map((fileSource) => fileSource.filePath));
  const errors: string[] = [];

  for (const fileSource of input.fileSources) {
    const { filePath, source } = fileSource;
    if (!shouldValidateFilePath(filePath, targetRoots)) {
      continue;
    }

    if (allowedUntestedFilePaths.has(filePath)) {
      continue;
    }

    if (countExportedFunctions(source) === 0) {
      continue;
    }

    const siblingTestFilePath = toSiblingTestFilePath(filePath);
    if (filePathSet.has(siblingTestFilePath)) {
      continue;
    }

    errors.push(
      `${filePath}: exported function file must have a sibling test file ("${basename(siblingTestFilePath)}").`,
    );
  }

  return errors.sort((left, right) => left.localeCompare(right));
}
