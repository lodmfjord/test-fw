/**
 * @fileoverview Implements resolve path from settings.
 */
import { isAbsolute, resolve } from "node:path";

/**
 * Runs resolve path from settings.
 * @param pathValue - Path value parameter.
 * @param settingsDirectory - Settings directory parameter.
 * @example
 * resolvePathFromSettings(pathValue, settingsDirectory)
 * @returns Output value.
 */
export function resolvePathFromSettings(pathValue: string, settingsDirectory: string): string {
  return isAbsolute(pathValue) ? pathValue : resolve(settingsDirectory, pathValue);
}
