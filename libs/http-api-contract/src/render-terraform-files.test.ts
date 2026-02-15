/**
 * @fileoverview Tests render terraform files.
 */
import { beforeEach, describe, expect, it } from "bun:test";
import { createDynamoDatabase } from "@babbstack/dynamodb";
import { schema } from "@babbstack/schema";
import { buildContractFromEndpoints } from "./build-contract-from-endpoints";
import { defineGet } from "./define-get";
import { definePatch } from "./define-patch";
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

    const files = renderTerraformFiles(contract, endpoints, [], {
      appName: "test-app",
      prefix: "babbstack",
      region: "eu-west-1",
      resources: {
        apiGateway: false,
        dynamodb: true,
        lambdas: false,
        sqs: false,
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

    const lambdaExternalModulesByRoute = {
      get_health: ["@aws-sdk/client-dynamodb", "@aws-sdk/util-dynamodb"],
    };
    const files = renderTerraformFiles(contract, endpoints, [], {
      appName: "test-app",
      lambdaExternalModulesByRoute,
      prefix: "babbstack",
      region: "eu-west-1",
      resources: {
        apiGateway: false,
        dynamodb: false,
        lambdas: true,
        sqs: false,
      },
    });
    const lambdaSource = files["lambdas.tf.json"] ?? "";

    expect(lambdaSource.includes('"aws_lambda_layer_version"')).toBe(true);
    expect(lambdaSource.includes('"lambda_layer_key_by_route"')).toBe(true);
    expect(lambdaSource.includes('"get_health": "')).toBe(true);
    expect(lambdaSource.includes('"layers": "${')).toBe(true);
    expect(lambdaSource.includes('"source_code_hash"')).toBe(true);
    expect(lambdaSource.includes("lookup(local.lambda_layer_key_by_route, each.key")).toBe(true);
    expect(lambdaSource.includes("aws_lambda_layer_version.external[layer_key].arn")).toBe(true);
    expect(lambdaSource.includes('"lambda_source_code_hash_by_route"')).toBe(true);
    expect(lambdaSource.includes('"external_layer_source_code_hash_by_key"')).toBe(true);
    expect(lambdaSource.includes("source-code-hashes.json")).toBe(true);
  });

  it("renders per-lambda iam roles and dynamodb permissions by route access", () => {
    const usersDatabase = createDynamoDatabase(
      {
        parse(input) {
          return input as { id: string };
        },
      },
      "id",
      { tableName: "users" },
    );
    const ordersDatabase = createDynamoDatabase(
      {
        parse(input) {
          return input as { id: string };
        },
      },
      "id",
      { tableName: "orders" },
    );

    defineGet({
      path: "/users/{id}",
      context: {
        database: {
          access: ["read"],
          handler: usersDatabase,
        },
      },
      handler: ({ params }) => ({
        value: {
          id: params.id,
        },
      }),
      request: {
        params: schema.object({
          id: schema.string(),
        }),
      },
      response: schema.object({
        id: schema.string(),
      }),
    });
    definePatch({
      path: "/orders/{id}",
      context: {
        database: {
          access: ["write"],
          handler: ordersDatabase,
        },
      },
      handler: ({ params }) => ({
        value: {
          id: params.id,
        },
      }),
      request: {
        params: schema.object({
          id: schema.string(),
        }),
      },
      response: schema.object({
        id: schema.string(),
      }),
    });
    defineGet({
      path: "/health",
      handler: () => ({
        value: {
          status: "ok",
        },
      }),
      response: schema.object({
        status: schema.string(),
      }),
    });

    const endpoints = listDefinedEndpoints();
    const contract = buildContractFromEndpoints({
      apiName: "terraform-iam-test",
      endpoints,
      version: "1.0.0",
    });

    const files = renderTerraformFiles(contract, endpoints, [], {
      appName: "test-app",
      prefix: "babbstack",
      region: "eu-west-1",
      resources: {
        apiGateway: false,
        dynamodb: false,
        lambdas: true,
        sqs: false,
      },
    });
    const lambdaSource = files["lambdas.tf.json"] ?? "";
    const lambdaJson = JSON.parse(lambdaSource) as {
      locals?: {
        lambda_dynamodb_access_by_route?: Record<
          string,
          {
            actions: string[];
            table_name: string;
          }
        >;
      };
    };
    const routeAccess = lambdaJson.locals?.lambda_dynamodb_access_by_route ?? {};

    expect(lambdaSource.includes('"aws_iam_role"')).toBe(true);
    expect(lambdaSource.includes('"aws_iam_role_policy_attachment"')).toBe(true);
    expect(lambdaSource.includes('"aws_iam_role_policy"')).toBe(true);
    expect(lambdaSource.includes(`"role": "\${aws_iam_role.route[each.key].arn}"`)).toBe(true);
    expect(lambdaSource.includes("AWSLambdaBasicExecutionRole")).toBe(true);
    expect(lambdaSource.includes('"SIMPLE_API_DYNAMODB_TABLE_NAME_PREFIX"')).toBe(false);
    expect(lambdaSource.includes('"lambda_execution_role_arn"')).toBe(false);
    expect(Object.keys(routeAccess).sort((left, right) => left.localeCompare(right))).toEqual([
      "get_users_param_id",
      "patch_orders_param_id",
    ]);
    expect(routeAccess.get_users_param_id?.table_name).toBe("users");
    expect(routeAccess.patch_orders_param_id?.table_name).toBe("orders");
    expect(routeAccess.get_users_param_id?.actions.includes("dynamodb:GetItem")).toBe(true);
    expect(routeAccess.get_users_param_id?.actions.includes("dynamodb:PutItem")).toBe(false);
    expect(routeAccess.patch_orders_param_id?.actions.includes("dynamodb:PutItem")).toBe(true);
    expect(lambdaSource.includes('"dynamodb:PutItem"')).toBe(true);
    expect(lambdaSource.includes('"dynamodb:GetItem"')).toBe(true);
  });
});
