import type {
  TerraformGeneratorSettings,
  TerraformResourceSelection,
} from "./contract-generator-types";
import { createLambdasTerraformJson } from "./create-lambdas-terraform-json";
import { toDynamodbTables } from "./to-dynamodb-tables";
import { toStateKey } from "./to-state-key";
import type { EndpointRuntimeDefinition } from "./types";
import type { Contract } from "./types";

type TerraformJson = Record<string, unknown>;
type TerraformRenderSettings = Pick<
  TerraformGeneratorSettings,
  "region" | "resources" | "state"
> & {
  appName: string;
  lambdaExternalModulesByRoute?: Record<string, string[]>;
  prefix: string;
};

type TerraformResolvedState = {
  bucket: string;
  encrypt: boolean;
  keyPrefix: string;
  lockTableName?: string;
};

function toTerraformString(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function toTerraformReference(expression: string): string {
  return `\${${expression}}`;
}

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

function createProviderTerraformJson(
  settings: TerraformRenderSettings,
  appName: string,
): TerraformJson {
  return {
    locals: {
      resource_name_prefix: `${toTerraformReference('join("-", compact([var.prefix, terraform.workspace, var.app_name]))')}-`,
    },
    provider: {
      aws: {
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

function createApiGatewayTerraformJson(contract: Contract): TerraformJson {
  return {
    resource: {
      aws_apigatewayv2_api: {
        http_api: {
          name: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.api_name")}`,
          protocol_type: "HTTP",
        },
      },
      aws_apigatewayv2_stage: {
        default: {
          api_id: toTerraformReference("aws_apigatewayv2_api.http_api.id"),
          auto_deploy: true,
          name: toTerraformReference(
            'var.stage_name == "$default" ? var.stage_name : join("", [local.resource_name_prefix, var.stage_name])',
          ),
        },
      },
    },
    variable: {
      api_name: { default: contract.deployContract.apiName, type: "string" },
      stage_name: {
        default: contract.deployContract.apiGateway.stageName,
        type: "string",
      },
    },
  };
}

function createApiGatewayLambdaBindingsTerraformJson(): TerraformJson {
  return {
    resource: {
      aws_apigatewayv2_integration: {
        route: {
          api_id: toTerraformReference("aws_apigatewayv2_api.http_api.id"),
          for_each: toTerraformReference("aws_lambda_function.route"),
          integration_type: "AWS_PROXY",
          integration_uri: toTerraformReference("each.value.invoke_arn"),
          payload_format_version: "2.0",
        },
      },
      aws_apigatewayv2_route: {
        route: {
          api_id: toTerraformReference("aws_apigatewayv2_api.http_api.id"),
          for_each: toTerraformReference("local.lambda_functions"),
          route_key: `${toTerraformReference("each.value.method")} ${toTerraformReference("each.value.path")}`,
          target: `integrations/${toTerraformReference("aws_apigatewayv2_integration.route[each.key].id")}`,
        },
      },
      aws_lambda_permission: {
        apigw_invoke: {
          action: "lambda:InvokeFunction",
          for_each: toTerraformReference("aws_lambda_function.route"),
          function_name: toTerraformReference("each.value.function_name"),
          principal: "apigateway.amazonaws.com",
          source_arn: `${toTerraformReference("aws_apigatewayv2_api.http_api.execution_arn")}/*/*`,
          statement_id: `AllowExecutionFromApiGateway-${toTerraformReference("each.key")}`,
        },
      },
    },
  };
}

function createDynamodbTerraformJson(
  endpoints: ReadonlyArray<EndpointRuntimeDefinition>,
): TerraformJson {
  return {
    locals: {
      dynamodb_tables: toDynamodbTables(endpoints),
    },
    resource: {
      aws_dynamodb_table: {
        table: {
          attribute: [
            {
              name: toTerraformReference("each.value.hash_key"),
              type: "S",
            },
          ],
          billing_mode: "PAY_PER_REQUEST",
          for_each: toTerraformReference("local.dynamodb_tables"),
          hash_key: toTerraformReference("each.value.hash_key"),
          name: `${toTerraformReference("local.resource_name_prefix")}${toTerraformReference("var.dynamodb_table_name_prefix")}${toTerraformReference("each.value.name")}`,
        },
      },
    },
    variable: {
      dynamodb_table_name_prefix: { default: "", type: "string" },
    },
  };
}

export function renderTerraformFiles(
  contract: Contract,
  endpoints: ReadonlyArray<EndpointRuntimeDefinition>,
  settings: TerraformRenderSettings,
): Record<string, string> {
  const appName = settings.appName.length > 0 ? settings.appName : contract.deployContract.apiName;
  const resources: TerraformResourceSelection = settings.resources;
  const files: Record<string, string> = {
    "provider.tf.json": toTerraformString(createProviderTerraformJson(settings, appName)),
  };

  if (resources.apiGateway) {
    files["api-gateway.tf.json"] = toTerraformString(createApiGatewayTerraformJson(contract));
  }

  if (resources.lambdas) {
    files["lambdas.tf.json"] = toTerraformString(
      createLambdasTerraformJson(
        contract,
        endpoints,
        settings.lambdaExternalModulesByRoute,
        resources.dynamodb,
      ),
    );
  }

  if (resources.apiGateway && resources.lambdas) {
    files["api-gateway-lambda-bindings.tf.json"] = toTerraformString(
      createApiGatewayLambdaBindingsTerraformJson(),
    );
  }

  if (resources.dynamodb) {
    files["dynamodb.tf.json"] = toTerraformString(createDynamodbTerraformJson(endpoints));
  }

  return files;
}
