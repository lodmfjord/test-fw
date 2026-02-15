/**
 * @fileoverview Implements to contract.
 */
import type { Contract } from "./types";

/**
 * Converts to contract.
 * @param value - Value parameter.
 * @param contractExportName - Contract export name parameter.
 * @example
 * toContract(value, contractExportName)
 * @returns Output value.
 * @throws Error when operation fails.
 */
export function toContract(value: unknown, contractExportName: string): Contract {
  if (!value || typeof value !== "object") {
    throw new Error(`Contract export "${contractExportName}" was not found or is invalid`);
  }

  return value as Contract;
}
