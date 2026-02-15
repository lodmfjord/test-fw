import type {
  TerraformGeneratorSettings,
  TerraformResourceSelection,
  TerraformStateSettings,
} from "./contract-generator-types";

type ToStringSetting = (
  value: unknown,
  settingName: string,
  options: { defaultValue?: string; required: boolean },
) => string;

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
      stepFunctions: false,
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
    stepFunctions:
      source.stepFunctions === undefined
        ? false
        : toBooleanSetting(source.stepFunctions, "terraform.resources.stepFunctions"),
  };
}

function toTerraformState(
  value: unknown,
  toStringSetting: ToStringSetting,
): TerraformStateSettings | undefined {
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

export function toTerraformSettings(
  value: unknown,
  toStringSetting: ToStringSetting,
): TerraformGeneratorSettings | undefined {
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
        stepFunctions: false,
      },
    };
  }

  const state = toTerraformState(source.state, toStringSetting);
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
