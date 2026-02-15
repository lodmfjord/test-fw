/**
 * @fileoverview Implements resolve path from settings.
 */
import { isAbsolute, resolve } from "node:path";

/**
 * Handles resolve path from settings.
 * @param pathValue - Path value parameter.
 * @param settingsDirectory - Settings directory parameter.
 * @example
 * resolvePathFromSettings(pathValue, settingsDirectory)
 */
export function resolvePathFromSettings(pathValue: string, settingsDirectory: string): string {
  return isAbsolute(pathValue) ? pathValue : resolve(settingsDirectory, pathValue);
}
