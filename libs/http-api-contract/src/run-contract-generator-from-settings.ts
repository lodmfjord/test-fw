import { readFile } from "node:fs/promises";
import { dirname } from "node:path";
import type {
  ContractGeneratorOutput,
  ContractGeneratorSettings,
  TerraformGeneratorSettings,
  TerraformResourceSelection,
  TerraformStateSettings,
} from "./contract-generator-types";
import { collectLambdaExternalModulesByRoute } from "./collect-lambda-external-modules-by-route";
import { listDefinedEndpoints } from "./list-defined-endpoints";
import { parseJsonc } from "./parse-jsonc";
import { renderTerraformFiles } from "./render-terraform-files";
import { resolvePathFromSettings } from "./resolve-path-from-settings";
import { resetDefinedEndpoints } from "./reset-defined-endpoints";
import { toContract } from "./to-contract";
import { toExternalModulesSetting } from "./to-external-modules-setting";
import { toImportPath } from "./to-import-path";
import { toLambdaLayerMetadata } from "./to-lambda-layer-metadata";
import { writeContractFiles } from "./write-contract-files-export";
import { writeLambdaLayerArtifacts } from "./write-lambda-layer-artifacts";
import { writeLambdaFunctionArtifacts } from "./write-lambda-function-artifacts";
import { writeLambdaJsFiles } from "./write-lambda-js-files-export";
import { writeTerraformFiles } from "./write-terraform-files";
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

function toBooleanSetting(value: unknown, settingName: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`Setting "${settingName}" must be a boolean`);
  }

  return value;
}

function toTerraformResources(value: unknown): TerraformResourceSelection {
  if (value === undefined) {
    return {
      apiGateway: true,
      dynamodb: true,
      lambdas: true,
    };
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error('Setting "terraform.resources" must be an object');
  }

  const source = value as Record<string, unknown>;
  return {
    apiGateway:
      source.apiGateway === undefined
        ? false
        : toBooleanSetting(source.apiGateway, "terraform.resources.apiGateway"),
    dynamodb:
      source.dynamodb === undefined
        ? false
        : toBooleanSetting(source.dynamodb, "terraform.resources.dynamodb"),
    lambdas:
      source.lambdas === undefined
        ? false
        : toBooleanSetting(source.lambdas, "terraform.resources.lambdas"),
  };
}

function toTerraformState(value: unknown): TerraformStateSettings | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === false) return { enabled: false };

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error('Setting "terraform.state" must be an object or false');
  }

  const source = value as Record<string, unknown>;
  if (source.enabled === false) return { enabled: false };

  return {
    bucket: toStringSetting(source.bucket, "terraform.state.bucket", { required: true }),
    encrypt:
      source.encrypt === undefined
        ? true
        : toBooleanSetting(source.encrypt, "terraform.state.encrypt"),
    keyPrefix: toStringSetting(source.keyPrefix, "terraform.state.keyPrefix", {
      required: true,
    }),
    lockTableName: toStringSetting(source.lockTableName, "terraform.state.lockTableName", {
      required: false,
    }),
  };
}

function toTerraformSettings(value: unknown): TerraformGeneratorSettings | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error('Setting "terraform" must be an object');
  }

  const source = value as Record<string, unknown>;
  const enabled = toBooleanSetting(source.enabled, "terraform.enabled");
  if (!enabled) {
    return {
      enabled: false,
      outputDirectory: "",
      region: "",
      resources: {
        apiGateway: false,
        dynamodb: false,
        lambdas: false,
      },
    };
  }

  const state = toTerraformState(source.state);
  return {
    enabled,
    outputDirectory: toStringSetting(source.outputDirectory, "terraform.outputDirectory", {
      required: true,
    }),
    region: toStringSetting(source.region, "terraform.region", {
      defaultValue: "us-east-1",
      required: false,
    }),
    resources: toTerraformResources(source.resources),
    ...(state ? { state } : {}),
  };
}

function toSettings(value: unknown): ContractGeneratorSettings {
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
  const terraform = toTerraformSettings(source.terraform);

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

export async function runContractGeneratorFromSettings(
  settingsFilePath: string,
): Promise<ContractGeneratorOutput> {
  const source = settingsFilePath.trim();
  if (source.length === 0) {
    throw new Error("settingsFilePath is required");
  }

  const absoluteSettingsPath = resolvePathFromSettings(source, process.cwd());
  const settingsDirectory = dirname(absoluteSettingsPath);
  const settingsSource = await readFile(absoluteSettingsPath, "utf8");

  let parsedSettings: unknown;
  try {
    parsedSettings = parseJsonc(settingsSource);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown parse error";
    throw new Error(`Invalid JSON in settings file "${absoluteSettingsPath}": ${message}`);
  }

  const settings = toSettings(parsedSettings);
  const endpointModulePath = resolvePathFromSettings(
    settings.endpointModulePath,
    settingsDirectory,
  );
  const contractModulePath = resolvePathFromSettings(
    settings.contractModulePath,
    settingsDirectory,
  );
  const contractsOutputDirectory = resolvePathFromSettings(
    settings.contractsOutputDirectory,
    settingsDirectory,
  );
  const lambdaOutputDirectory = resolvePathFromSettings(
    settings.lambdaOutputDirectory,
    settingsDirectory,
  );
  const terraformOutputDirectory =
    settings.terraform?.enabled && settings.terraform.outputDirectory
      ? resolvePathFromSettings(settings.terraform.outputDirectory, settingsDirectory)
      : undefined;

  resetDefinedEndpoints();
  await import(toImportPath(endpointModulePath));
  const contractModule = (await import(toImportPath(contractModulePath))) as Record<
    string,
    unknown
  >;
  const contract = toContract(
    contractModule[settings.contractExportName ?? "contract"],
    settings.contractExportName ?? "contract",
  );
  const contractFiles = await writeContractFiles(contractsOutputDirectory, contract);
  const endpoints = listDefinedEndpoints();
  const lambdaFiles = await writeLambdaJsFiles(lambdaOutputDirectory, endpoints, {
    endpointModulePath,
    ...(settings.externalModules ? { externalModules: settings.externalModules } : {}),
  });
  const lambdaExternalModulesByRoute = await collectLambdaExternalModulesByRoute(
    lambdaOutputDirectory,
    lambdaFiles,
    settings.externalModules,
    endpointModulePath,
  );
  const lambdaLayerMetadata = toLambdaLayerMetadata(lambdaExternalModulesByRoute);
  if (terraformOutputDirectory && settings.terraform?.resources.lambdas) {
    await writeLambdaFunctionArtifacts(
      resolvePathFromSettings("lambda-artifacts", terraformOutputDirectory),
      contract.lambdasManifest,
      lambdaOutputDirectory,
    );
    await writeLambdaLayerArtifacts(
      resolvePathFromSettings("layer-artifacts", terraformOutputDirectory),
      lambdaLayerMetadata,
      settingsDirectory,
    );
  }
  const terraformFiles =
    terraformOutputDirectory && settings.terraform
      ? await writeTerraformFiles(
          terraformOutputDirectory,
          renderTerraformFiles(contract, endpoints, {
            appName: settings.appName ?? "",
            lambdaExternalModulesByRoute,
            prefix: settings.prefix ?? "",
            ...settings.terraform,
          }),
        )
      : undefined;

  return {
    contractFiles,
    lambdaFiles,
    ...(terraformFiles ? { terraformFiles } : {}),
  };
}
