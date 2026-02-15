/**
 * @fileoverview Tests render terraform lambda dynamodb prefix.
 */
import { beforeEach, describe, expect, it } from "bun:test";
import { createDynamoDatabase } from "@babbstack/dynamodb";
import { schema } from "@babbstack/schema";
import { buildContractFromEndpoints } from "./build-contract-from-endpoints";
import { defineGet } from "./define-get";
import { listDefinedEndpoints } from "./list-defined-endpoints";
import { renderTerraformFiles } from "./render-terraform-files";
import { resetDefinedEndpoints } from "./reset-defined-endpoints";

describe("renderTerraformFiles lambda dynamodb prefix", () => {
  beforeEach(() => {
    resetDefinedEndpoints();
  });

  it("injects managed dynamodb table name prefix into lambda environment", () => {
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
      handler: async ({ params }) => ({
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

    const endpoints = listDefinedEndpoints();
    const contract = buildContractFromEndpoints({
      apiName: "terraform-db-prefix-test",
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
        lambdas: true,
        sqs: false,
      },
    });
    const lambdaSource = files["lambdas.tf.json"] ?? "";

    expect(lambdaSource.includes('"SIMPLE_API_DYNAMODB_TABLE_NAME_PREFIX"')).toBe(true);
    expect(
      lambdaSource.includes(`"\${local.resource_name_prefix}\${var.dynamodb_table_name_prefix}"`),
    ).toBe(true);
  });
});
