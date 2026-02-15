#!/usr/bin/env bun
/**
 * @fileoverview Implements generate contracts bin.
 */
import { runContractGeneratorFromSettings } from "./run-contract-generator-from-settings";
import { toGenerateContractsCliCommand } from "./to-generate-contracts-cli-command";
import { writeDefaultGeneratorSettingsFile } from "./write-default-generator-settings-file";

if (import.meta.main) {
  try {
    const command = toGenerateContractsCliCommand(process.argv.slice(2));
    if (command.kind === "init") {
      await writeDefaultGeneratorSettingsFile(command.settingsFilePath);
      console.log(`Created ${command.settingsFilePath}`);
      process.exit(0);
    }

    const output = await runContractGeneratorFromSettings(command.settingsFilePath);
    const terraformSuffix = output.terraformFiles
      ? ` and ${output.terraformFiles.length} terraform files`
      : "";
    console.log(
      `Generated ${output.contractFiles.length} contract files and ${output.lambdaFiles.length} lambda js files${terraformSuffix}`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(message);
    process.exit(1);
  }
}
