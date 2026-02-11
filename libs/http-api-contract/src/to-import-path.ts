import { pathToFileURL } from "node:url";

export function toImportPath(pathValue: string): string {
  const cacheBuster = `${Date.now()}-${Math.random()}`;
  return `${pathToFileURL(pathValue).href}?cache=${cacheBuster}`;
}
