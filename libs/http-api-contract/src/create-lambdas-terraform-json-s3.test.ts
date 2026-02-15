/**
 * @fileoverview Tests createLambdasTerraformJson s3 behavior.
 */
import { describe, expect, it } from "bun:test";
import { createLambdasTerraformJson } from "./create-lambdas-terraform-json";

describe("createLambdasTerraformJson s3", () => {
  it("renders route s3 iam policy metadata for configured context.s3 access", () => {
    const terraformJson = createLambdasTerraformJson(
      {
        lambdasManifest: {
          functions: [
            {
              architecture: "arm64",
              artifactPath: "get-files.zip",
              method: "GET",
              path: "/files/{key}",
              routeId: "get_files_param_key",
              runtime: "nodejs20.x",
            },
          ],
        },
      } as never,
      [
        {
          context: {
            s3: {
              access: ["read", "list"],
              runtime: {
                bucketName: "uploads-bucket",
              },
            },
          },
          execution: {
            kind: "lambda",
          },
          routeId: "get_files_param_key",
        },
      ] as never,
      [],
      undefined,
      false,
      false,
    ) as {
      locals: {
        lambda_s3_buckets_by_key?: Record<string, unknown>;
        lambda_s3_access_by_route?: Record<string, unknown>;
      };
      resource: {
        aws_lambda_function: {
          route: {
            environment?: {
              variables?: Record<string, string>;
            };
          };
        };
        aws_s3_bucket?: Record<string, unknown>;
        aws_iam_role_policy?: Record<string, unknown>;
      };
      variable: Record<string, unknown>;
    };

    const s3PrefixExpression = [
      "$",
      "{local.resource_name_prefix}",
      "$",
      "{var.s3_bucket_name_prefix}",
    ].join("");

    expect(terraformJson.locals.lambda_s3_buckets_by_key).toEqual({
      uploads_bucket: {
        bucket_name: "uploads-bucket",
      },
    });
    expect(terraformJson.locals.lambda_s3_access_by_route).toEqual({
      get_files_param_key: {
        bucket_actions: ["s3:ListBucket"],
        bucket_key: "uploads_bucket",
        bucket_name: "uploads-bucket",
        object_actions: ["s3:GetObject"],
      },
    });
    expect(terraformJson.resource.aws_s3_bucket?.route_s3).toBeDefined();
    expect(terraformJson.resource.aws_iam_role_policy?.route_s3).toBeDefined();
    expect(terraformJson.resource.aws_lambda_function.route.environment?.variables).toEqual({
      SIMPLE_API_S3_BUCKET_NAME_PREFIX: s3PrefixExpression,
    });
    expect(terraformJson.variable.lambda_s3_policy_name_prefix).toBeDefined();
    expect(terraformJson.variable.s3_bucket_name_prefix).toBeDefined();
  });
});
