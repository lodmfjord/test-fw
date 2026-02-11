import { isAbsolute, resolve } from "node:path";

export function resolvePathFromSettings(pathValue: string, settingsDirectory: string): string {
  return isAbsolute(pathValue) ? pathValue : resolve(settingsDirectory, pathValue);
}
