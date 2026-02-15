/**
 * @fileoverview Implements write contract files.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { renderContractFiles } from "./render-contract-files";
import type { Contract } from "./types";

/**
 * Handles write contract files.
 * @param outputDirectory - Output directory parameter.
 * @param contract - Contract parameter.
 * @example
 * await writeContractFiles(outputDirectory, contract)
 */
export async function writeContractFiles(
  outputDirectory: string,
  contract: Contract,
): Promise<string[]> {
  const directory = outputDirectory.trim();
  if (directory.length === 0) {
    throw new Error("outputDirectory is required");
  }

  const files = renderContractFiles(contract);
  await mkdir(directory, { recursive: true });

  const fileNames = Object.keys(files).sort((left, right) => left.localeCompare(right));
  for (const fileName of fileNames) {
    const source = files[fileName];
    if (source === undefined) {
      continue;
    }

    await writeFile(join(directory, fileName), source, "utf8");
  }

  return fileNames;
}
