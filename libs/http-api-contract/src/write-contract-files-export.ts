import type { Contract } from "./types";

export async function writeContractFiles(
  outputDirectory: string,
  contract: Contract,
): Promise<string[]> {
  const module = await import("./write-contract-files");
  return module.writeContractFiles(outputDirectory, contract);
}
