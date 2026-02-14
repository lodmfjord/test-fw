import type {
  ContractGeneratorSettings,
  TerraformGeneratorSettings,
  TerraformResourceSelection,
  TerraformStateSettings,
} from "./contract-generator-types";
import { toExternalModulesSetting } from "./to-external-modules-setting";

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
  if (typeof value === "boolean") {
    return value;
  }

  throw new Error(`Setting "${settingName}" must be a boolean`);
}

function toTerraformResources(value: unknown): TerraformResourceSelection {
  if (value === undefined) {
    return {
      apiGateway: true,
      dynamodb: true,
      lambdas: true,
      sqs: false,
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
    sqs: source.sqs === undefined ? false : toBooleanSetting(source.sqs, "terraform.resources.sqs"),
  };
}

function toTerraformState(value: unknown): TerraformStateSettings | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === false) {
    return { enabled: false };
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error('Setting "terraform.state" must be an object or false');
  }

  const source = value as Record<string, unknown>;
  if (source.enabled === false) {
    return { enabled: false };
  }

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
        sqs: false,
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
