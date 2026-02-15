/**
 * @fileoverview Implements create provider terraform json.
 */
import { toStateKey } from "./to-state-key";
import type { TerraformJson, TerraformRenderSettings } from "./terraform-render-types";

type TerraformResolvedState = {
  bucket: string;
  encrypt: boolean;
  keyPrefix: string;
  lockTableName?: string;
};

/** Converts to terraform reference. */
function toTerraformReference(expression: string): string {
  return `\${${expression}}`;
}

/** Converts to resolved state settings. */
function toResolvedStateSettings(
  settings: TerraformRenderSettings,
  appName: string,
): TerraformResolvedState | undefined {
  if (settings.state) {
    if (settings.state.enabled === false) {
      return undefined;
    }

    return {
      bucket: settings.state.bucket,
      encrypt: settings.state.encrypt,
      keyPrefix: settings.state.keyPrefix,
      ...(settings.state.lockTableName
        ? {
            lockTableName: settings.state.lockTableName,
          }
        : {}),
    };
  }

  const stateResourcePrefix =
    settings.prefix.length > 0 ? `${settings.prefix}-${appName}` : appName;
  return {
    bucket: `${stateResourcePrefix}-terraform-state`,
    encrypt: true,
    keyPrefix: settings.prefix.length > 0 ? `${settings.prefix}/${appName}` : appName,
    lockTableName: `${stateResourcePrefix}-terraform-locks`,
  };
}

/** Converts to terraform block. */
function toTerraformBlock(settings: TerraformRenderSettings, appName: string): TerraformJson {
  const state = toResolvedStateSettings(settings, appName);
  const terraformBlock: TerraformJson = {
    required_providers: {
      aws: {
        source: "hashicorp/aws",
        version: ">= 5.0.0",
      },
    },
    required_version: ">= 1.5.0",
  };

  if (!state) {
    return terraformBlock;
  }

  terraformBlock.backend = {
    s3: {
      bucket: state.bucket,
      encrypt: state.encrypt,
      key: toStateKey(state),
      region: settings.region,
      workspace_key_prefix: state.keyPrefix.replace(/\/+$/g, ""),
      ...(state.lockTableName
        ? {
            dynamodb_table: state.lockTableName,
          }
        : {}),
    },
  };

  return terraformBlock;
}

/**
 * Creates provider terraform json.
 * @param settings - Settings parameter.
 * @param appName - App name parameter.
 * @example
 * createProviderTerraformJson(settings, appName)
 * @returns Output value.
 */
export function createProviderTerraformJson(
  settings: TerraformRenderSettings,
  appName: string,
): TerraformJson {
  return {
    locals: {
      resource_name_prefix: `${toTerraformReference('join("-", compact([var.prefix, terraform.workspace, var.app_name]))')}-`,
    },
    provider: {
      aws: {
        default_tags: {
          tags: {
            "maintained-by": "babbstack",
            name: appName,
          },
        },
        region: toTerraformReference("var.aws_region"),
      },
    },
    terraform: toTerraformBlock(settings, appName),
    variable: {
      aws_region: {
        default: settings.region,
        type: "string",
      },
      app_name: {
        default: appName,
        type: "string",
      },
      prefix: {
        default: settings.prefix,
        type: "string",
      },
    },
  };
}
