/**
 * @fileoverview Implements collect target files.
 */
import { readdir } from "node:fs/promises";
import { join } from "node:path";

const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];
const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".idea",
  ".vscode",
  "coverage",
  "dist",
  "node_modules",
]);

/** Runs walk directory. */ async function walkDirectory(directoryPath: string): Promise<string[]> {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) {
      continue;
    }

    const fullPath = join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkDirectory(fullPath)));
      continue;
    }

    if (SOURCE_EXTENSIONS.some((extension) => entry.name.endsWith(extension))) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Runs collect target files.
 * @param rootDirectories - Root directories parameter.
 * @example
 * await collectTargetFiles(rootDirectories)
 * @returns Output value.
 */ export async function collectTargetFiles(rootDirectories: string[]): Promise<string[]> {
  const allFiles: string[] = [];

  for (const rootDirectory of rootDirectories) {
    allFiles.push(...(await walkDirectory(rootDirectory)));
  }

  return allFiles.sort((left, right) => left.localeCompare(right));
}
