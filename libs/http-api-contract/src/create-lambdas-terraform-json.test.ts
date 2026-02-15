/**
 * @fileoverview Tests createLambdasTerraformJson behavior.
 */
import { describe, expect, it } from "bun:test";
import { createLambdasTerraformJson } from "./create-lambdas-terraform-json";

describe("createLambdasTerraformJson", () => {
  it("adds caller identity data when unmanaged dynamodb or sqs references are used", () => {
    const terraformJson = createLambdasTerraformJson(
      {
        lambdasManifest: {
          functions: [
            {
              architecture: "arm64",
              artifactPath: "get-users.zip",
              memoryMb: 256,
              method: "GET",
              path: "/users",
              routeId: "get_users",
              runtime: "nodejs20.x",
              timeoutSeconds: 15,
            },
          ],
        },
      } as never,
      [
        {
          context: {
            database: {
              access: ["read"],
              runtime: {
                tableName: "users-table",
              },
            },
            sqs: {
              runtime: {
                queueName: "users-queue",
              },
            },
          },
          routeId: "get_users",
        },
      ] as never,
      [
        {
          listenerId: "sync_users",
          queue: {
            runtime: {
              queueName: "users-queue",
            },
          },
          target: {
            kind: "lambda",
          },
        },
      ] as never,
      {
        get_users: ["zod", "fake-layer-one"],
      },
      false,
      false,
    ) as {
      data?: Record<string, unknown>;
      locals: Record<string, unknown>;
      resource: Record<string, Record<string, unknown>>;
      variable: Record<string, unknown>;
    };

    expect(terraformJson.data?.aws_caller_identity).toBeDefined();
    expect(terraformJson.locals.external_layers).toBeDefined();
    expect(terraformJson.resource.aws_lambda_layer_version).toBeDefined();
    expect(terraformJson.resource.aws_lambda_event_source_mapping).toBeDefined();
    expect(terraformJson.variable.lambda_layer_artifacts_base_path).toBeDefined();
    expect(terraformJson.variable.sqs_queue_name_prefix).toBeUndefined();
  });

  it("injects managed resource prefixes and omits caller identity data", () => {
    const terraformJson = createLambdasTerraformJson(
      {
        lambdasManifest: {
          functions: [
            {
              architecture: "arm64",
              artifactPath: "get-users.zip",
              memoryMb: 256,
              method: "GET",
              path: "/users",
              routeId: "get_users",
              runtime: "nodejs20.x",
              timeoutSeconds: 15,
            },
          ],
        },
      } as never,
      [],
      [],
      undefined,
      true,
      true,
    ) as {
      data?: Record<string, unknown>;
      resource: {
        aws_lambda_function: {
          route: {
            environment?: {
              variables?: Record<string, string>;
            };
          };
        };
      };
      variable: Record<string, unknown>;
    };
    const dynamodbPrefixExpression = [
      "$",
      "{local.resource_name_prefix}",
      "$",
      "{var.dynamodb_table_name_prefix}",
    ].join("");
    const sqsPrefixExpression = [
      "$",
      "{local.resource_name_prefix}",
      "$",
      "{var.sqs_queue_name_prefix}",
    ].join("");

    expect(terraformJson.data).toBeUndefined();
    expect(terraformJson.resource.aws_lambda_function.route.environment?.variables).toEqual({
      SIMPLE_API_DYNAMODB_TABLE_NAME_PREFIX: dynamodbPrefixExpression,
      SIMPLE_API_SQS_QUEUE_NAME_PREFIX: sqsPrefixExpression,
    });
    expect(terraformJson.variable.sqs_queue_name_prefix).toBeDefined();
  });
});
