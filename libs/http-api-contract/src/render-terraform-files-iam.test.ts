/**
 * @fileoverview Tests render-terraform-files iam and dynamodb route access behavior.
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

describe("renderTerraformFiles iam and dynamodb route access", () => {
  beforeEach(() => {
    resetDefinedEndpoints();
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
