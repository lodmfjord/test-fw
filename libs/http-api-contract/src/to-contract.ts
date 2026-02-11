import type { Contract } from "./types";

export function toContract(value: unknown, contractExportName: string): Contract {
  if (!value || typeof value !== "object") {
    throw new Error(`Contract export "${contractExportName}" was not found or is invalid`);
  }

  return value as Contract;
}
