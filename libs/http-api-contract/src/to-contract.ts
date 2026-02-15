/** @fileoverview Implements to contract. @module libs/http-api-contract/src/to-contract */
import type { Contract } from "./types";

/** Converts values to contract. @example `toContract(input)` */
export function toContract(value: unknown, contractExportName: string): Contract {
  if (!value || typeof value !== "object") {
    throw new Error(`Contract export "${contractExportName}" was not found or is invalid`);
  }

  return value as Contract;
}
