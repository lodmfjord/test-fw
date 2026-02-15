/**
 * @fileoverview Tests to endpoint s3 context behavior.
 */
import { describe, expect, it } from "bun:test";
import { createMemoryS3 } from "@babbstack/s3";
import { toEndpointS3Context } from "./to-endpoint-s3-context";

describe("toEndpointS3Context", () => {
  it("returns undefined when endpoint has no context.s3", () => {
    const context = toEndpointS3Context(createMemoryS3(), {
      routeId: "get_health",
    } as never);

    expect(context).toBeUndefined();
  });

  it("binds a read-only bucket and blocks write operations", async () => {
    const bucket = toEndpointS3Context(createMemoryS3(), {
      context: {
        s3: {
          access: ["read"],
          runtime: {
            bucketName: "uploads",
          },
        },
      },
    } as never) as {
      put(input: { body: string; key: string }): Promise<unknown>;
    };

    await expect(
      bucket.put({
        body: "forbidden",
        key: "demo.txt",
      }),
    ).rejects.toThrow("S3 context does not allow write access");
  });
});
