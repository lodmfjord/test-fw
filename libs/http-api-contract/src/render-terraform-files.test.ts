import { beforeEach, describe, expect, it } from "bun:test";
import { createDynamoDatabase } from "@babbstack/dynamodb";
import { schema } from "@babbstack/schema";
import { buildContractFromEndpoints } from "./build-contract-from-endpoints";
import { defineGet } from "./define-get";
import { listDefinedEndpoints } from "./list-defined-endpoints";
import { renderTerraformFiles } from "./render-terraform-files";
import { resetDefinedEndpoints } from "./reset-defined-endpoints";

describe("renderTerraformFiles", () => {
  beforeEach(() => {
    resetDefinedEndpoints();
  });

  it("renders only selected terraform resources", () => {
    const usersDatabase = createDynamoDatabase(
      {
        parse(input) {
          return input as {
            id: string;
          };
        },
      },
      "id",
      {
        tableName: "users",
      },
    );

    defineGet({
      path: "/users/{id}",
      context: {
        database: {
          access: ["read"],
          handler: usersDatabase,
        },
      },
      handler: async ({ params }) => {
        return {
          value: {
            id: params.id,
          },
        };
      },
      request: {
        params: schema.object({
          id: schema.string(),
        }),
      },
      response: schema.object({
        id: schema.string(),
      }),
    });

    const endpoints = listDefinedEndpoints();
    const contract = buildContractFromEndpoints({
      apiName: "terraform-select-test",
      endpoints,
      version: "1.0.0",
    });

    const files = renderTerraformFiles(contract, endpoints, {
      appName: "test-app",
      prefix: "babbstack",
      region: "eu-west-1",
      resources: {
        apiGateway: false,
        dynamodb: true,
        lambdas: false,
      },
    });
    const dynamodbSource = files["dynamodb.tf.json"] ?? "";
    const providerSource = files["provider.tf.json"] ?? "";

    expect(Object.keys(files).sort((left, right) => left.localeCompare(right))).toEqual([
      "dynamodb.tf.json",
      "provider.tf.json",
    ]);
    expect(dynamodbSource.includes('"aws_dynamodb_table"')).toBe(true);
    expect(dynamodbSource.includes('"aws_apigatewayv2_api"')).toBe(false);
    expect(dynamodbSource.includes('"aws_lambda_function"')).toBe(false);
    expect(providerSource.includes('"required_providers"')).toBe(true);
    expect(providerSource.includes('"default": "eu-west-1"')).toBe(true);
    expect(providerSource.includes('"default": "test-app"')).toBe(true);
    expect(providerSource.includes('"default": "babbstack"')).toBe(true);
    expect(providerSource.includes("terraform.workspace")).toBe(true);
  });

  it("renders lambda layers only for lambdas that require external modules", () => {
    defineGet({
      path: "/health",
      handler: () => {
        return {
          value: {
            status: "ok",
          },
        };
      },
      response: schema.object({
        status: schema.string(),
      }),
    });

    const endpoints = listDefinedEndpoints();
    const contract = buildContractFromEndpoints({
      apiName: "terraform-layers-test",
      endpoints,
      version: "1.0.0",
    });

    const files = renderTerraformFiles(contract, endpoints, {
      appName: "test-app",
      lambdaExternalModulesByRoute: {
        get_health: ["@aws-sdk/client-dynamodb", "@aws-sdk/util-dynamodb"],
      },
      prefix: "babbstack",
      region: "eu-west-1",
      resources: {
        apiGateway: false,
        dynamodb: false,
        lambdas: true,
      },
    });
    const lambdaSource = files["lambdas.tf.json"] ?? "";

    expect(lambdaSource.includes('"aws_lambda_layer_version"')).toBe(true);
    expect(lambdaSource.includes('"lambda_layer_key_by_route"')).toBe(true);
    expect(lambdaSource.includes('"get_health": "')).toBe(true);
    expect(lambdaSource.includes('"layers": "${')).toBe(true);
    expect(lambdaSource.includes("lookup(local.lambda_layer_key_by_route, each.key")).toBe(true);
    expect(lambdaSource.includes("aws_lambda_layer_version.external[layer_key].arn")).toBe(true);
  });
});
