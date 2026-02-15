/**
 * @fileoverview Implements write contract files export.
 */
import type { Contract } from "./types";

/**
 * Runs write contract files.
 * @param outputDirectory - Output directory parameter.
 * @param contract - Contract parameter.
 * @example
 * await writeContractFiles(outputDirectory, contract)
 * @returns Output value.
 */
export async function writeContractFiles(
  outputDirectory: string,
  contract: Contract,
): Promise<string[]> {
  const module = await import("./write-contract-files");
  return module.writeContractFiles(outputDirectory, contract);
}
