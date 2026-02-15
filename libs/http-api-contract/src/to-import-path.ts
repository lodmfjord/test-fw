/**
 * @fileoverview Implements to import path.
 */
import { pathToFileURL } from "node:url";

/**
 * Converts values to import path.
 * @param pathValue - Path value parameter.
 * @example
 * toImportPath(pathValue)
 */
export function toImportPath(pathValue: string): string {
  const cacheBuster = `${Date.now()}-${Math.random()}`;
  return `${pathToFileURL(pathValue).href}?cache=${cacheBuster}`;
}
