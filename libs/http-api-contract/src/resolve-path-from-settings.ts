/** @fileoverview Implements resolve path from settings. @module libs/http-api-contract/src/resolve-path-from-settings */
import { isAbsolute, resolve } from "node:path";

/** Handles resolve path from settings. @example `resolvePathFromSettings(input)` */
export function resolvePathFromSettings(pathValue: string, settingsDirectory: string): string {
  return isAbsolute(pathValue) ? pathValue : resolve(settingsDirectory, pathValue);
}
