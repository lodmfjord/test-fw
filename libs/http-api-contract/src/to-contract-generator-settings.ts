/** @fileoverview Implements to contract generator settings. @module libs/http-api-contract/src/to-contract-generator-settings */
import type { ContractGeneratorSettings } from "./contract-generator-types";
import { toExternalModulesSetting } from "./to-external-modules-setting";
import { toTerraformSettings } from "./to-terraform-settings";

/** Converts values to string setting. */
function toStringSetting(
  value: unknown,
  settingName: string,
  options: { defaultValue?: string; required: boolean },
): string {
  if (value === undefined || value === null) {
    if (options.required) {
      throw new Error(`Missing required setting: ${settingName}`);
    }

    return options.defaultValue ?? "";
  }

  if (typeof value !== "string") {
    throw new Error(`Setting "${settingName}" must be a string`);
  }

  const source = value.trim();
  if (source.length === 0) {
    if (options.required) {
      throw new Error(`Setting "${settingName}" must not be empty`);
    }

    return options.defaultValue ?? "";
  }

  return source;
}

/** Converts values to contract generator settings. @example `toContractGeneratorSettings(input)` */
export function toContractGeneratorSettings(value: unknown): ContractGeneratorSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Settings JSON must be an object");
  }

  const source = value as Record<string, unknown>;
  const appName = toStringSetting(source.appName, "appName", {
    required: false,
  });
  const contractExportName = toStringSetting(source.contractExportName, "contractExportName", {
    defaultValue: "contract",
    required: false,
  });
  const externalModules = toExternalModulesSetting(source.externalModules);
  const prefix = toStringSetting(source.prefix, "prefix", {
    required: false,
  });
  const terraform = toTerraformSettings(source.terraform, toStringSetting);

  return {
    ...(appName ? { appName } : {}),
    contractExportName,
    contractModulePath: toStringSetting(source.contractModulePath, "contractModulePath", {
      required: true,
    }),
    contractsOutputDirectory: toStringSetting(
      source.contractsOutputDirectory,
      "contractsOutputDirectory",
      {
        required: true,
      },
    ),
    endpointExportName: toStringSetting(source.endpointExportName, "endpointExportName", {
      defaultValue: "endpoints",
      required: false,
    }),
    endpointModulePath: toStringSetting(source.endpointModulePath, "endpointModulePath", {
      required: true,
    }),
    ...(externalModules ? { externalModules } : {}),
    lambdaOutputDirectory: toStringSetting(source.lambdaOutputDirectory, "lambdaOutputDirectory", {
      required: true,
    }),
    ...(prefix ? { prefix } : {}),
    ...(terraform ? { terraform } : {}),
  };
}
