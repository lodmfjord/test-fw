/** @fileoverview Implements create api gateway terraform json. @module libs/http-api-contract/src/create-api-gateway-terraform-json */
import type { Contract } from "./types";

type TerraformJson = Record<string, unknown>;

/** Converts values to terraform reference. */
function toTerraformReference(expression: string): string {
  return `\${${expression}}`;
}

/** Converts values to cors configuration. */
function toCorsConfiguration(contract: Contract): Record<string, unknown> | undefined {
  const cors = contract.deployContract.apiGateway.cors;
  if (!cors) {
    return undefined;
  }

  const methods = [...new Set(contract.routesManifest.routes.map((route) => route.method))].sort(
    (left, right) => left.localeCompare(right),
  );

  return {
    ...(cors.allowCredentials ? { allow_credentials: true } : {}),
    ...(cors.allowHeaders?.length ? { allow_headers: [...cors.allowHeaders] } : {}),
    allow_methods: methods,
    allow_origins: [cors.allowOrigin],
    ...(cors.exposeHeaders?.length ? { expose_headers: [...cors.exposeHeaders] } : {}),
    ...(cors.maxAgeSeconds !== undefined ? { max_age: cors.maxAgeSeconds } : {}),
  };
}

/** Creates api gateway terraform json. @example `createApiGatewayTerraformJson(input)` */
export function createApiGatewayTerraformJson(contract: Contract): TerraformJson {
  const corsConfiguration = toCorsConfiguration(contract);

  return {
    resource: {
      aws_apigatewayv2_api: {
        http_api: {
          ...(corsConfiguration ? { cors_configuration: corsConfiguration } : {}),
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
