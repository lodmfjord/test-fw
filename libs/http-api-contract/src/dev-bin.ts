#!/usr/bin/env bun
/**
 * @fileoverview Implements dev bin.
 */
import { createLogger } from "@babbstack/logger";
import { runDevAppFromSettings } from "./run-dev-app-from-settings";

const DEFAULT_SETTINGS_FILE_PATH = "babb.settings.json";

/** Converts to settings file path. */
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
  const logger = createLogger({
    serviceName: "http-api-contract-dev-bin",
  });

  try {
    await runDevAppFromSettings(toSettingsFilePath(process.argv.slice(2)), {
      logger,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error(message);
    process.exit(1);
  }
}
