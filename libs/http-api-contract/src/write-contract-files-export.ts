/** @fileoverview Implements write contract files export. @module libs/http-api-contract/src/write-contract-files-export */
import type { Contract } from "./types";

/** Handles write contract files. @example `await writeContractFiles(input)` */
export async function writeContractFiles(
  outputDirectory: string,
  contract: Contract,
): Promise<string[]> {
  const module = await import("./write-contract-files");
  return module.writeContractFiles(outputDirectory, contract);
}
