/** @fileoverview Implements to import path. @module libs/http-api-contract/src/to-import-path */
import { pathToFileURL } from "node:url";

/** Converts values to import path. @example `toImportPath(input)` */
export function toImportPath(pathValue: string): string {
  const cacheBuster = `${Date.now()}-${Math.random()}`;
  return `${pathToFileURL(pathValue).href}?cache=${cacheBuster}`;
}
