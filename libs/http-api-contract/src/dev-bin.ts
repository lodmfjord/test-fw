#!/usr/bin/env bun
import { runDevAppFromSettings } from "./run-dev-app-from-settings";

const DEFAULT_SETTINGS_FILE_PATH = "babb.settings.json";

function toSettingsFilePath(argv: string[]): string {
  const settingsFlagIndex = argv.indexOf("--settings");
  if (settingsFlagIndex >= 0) {
    const value = argv[settingsFlagIndex + 1];
    if (!value) {
      throw new Error('Missing value for "--settings"');
    }

    return value;
  }

  const directPath = argv[0];
  if (directPath) {
    return directPath;
  }

  return DEFAULT_SETTINGS_FILE_PATH;
}

if (import.meta.main) {
  try {
    await runDevAppFromSettings(toSettingsFilePath(process.argv.slice(2)));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(message);
    process.exit(1);
  }
}
