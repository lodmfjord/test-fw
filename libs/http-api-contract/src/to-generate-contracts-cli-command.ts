/**
 * @fileoverview Implements to generate contracts cli command.
 */
const DEFAULT_SETTINGS_FILE_PATH = "babb.settings.json";

type GenerateContractsCliCommand = {
  kind: "generate" | "init";
  settingsFilePath: string;
};

/** Converts values to settings file path. */
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

/**
 * Converts values to generate contracts cli command.
 * @param argv - Argv parameter.
 * @example
 * toGenerateContractsCliCommand(argv)
 */
export function toGenerateContractsCliCommand(argv: string[]): GenerateContractsCliCommand {
  const command = argv[0];
  if (command === "init") {
    return {
      kind: "init",
      settingsFilePath: toSettingsFilePath(argv.slice(1)),
    };
  }

  if (command === "generate") {
    return {
      kind: "generate",
      settingsFilePath: toSettingsFilePath(argv.slice(1)),
    };
  }

  return {
    kind: "generate",
    settingsFilePath: toSettingsFilePath(argv),
  };
}
