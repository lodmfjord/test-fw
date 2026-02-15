/**
 * @fileoverview Tests to route s3 access behavior.
 */
import { describe, expect, it } from "bun:test";
import { toRouteS3Access } from "./to-s3-lambda-metadata";

describe("toRouteS3Access", () => {
  it("maps s3 access for lambda endpoints", () => {
    const access = toRouteS3Access([
      {
        context: {
          s3: {
            access: ["read", "list", "remove"],
            runtime: {
              bucketName: "uploads-bucket",
            },
          },
        },
        execution: {
          kind: "lambda",
        },
        routeId: "get_uploads_param_key",
      } as never,
      {
        execution: {
          kind: "step-function",
        },
        routeId: "post_flow",
      } as never,
    ]);

    expect(access).toEqual({
      get_uploads_param_key: {
        bucket_actions: ["s3:ListBucket"],
        bucket_key: "uploads_bucket",
        bucket_name: "uploads-bucket",
        object_actions: ["s3:DeleteObject", "s3:GetObject"],
      },
    });
  });
});
