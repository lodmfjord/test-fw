/**
 * @fileoverview Tests create dev app context s3.
 */
import { describe, expect, it } from "bun:test";
import { createBucket, createMemoryS3 } from "@babbstack/s3";
import { schema } from "@babbstack/schema";
import { createDevApp } from "./create-dev-app";
import { defineEndpoint } from "./define-endpoint";

describe("createDevApp context.s3", () => {
  it("binds configured s3 bucket into endpoint context", async () => {
    const bucket = createBucket({ name: "uploads" });
    const fetch = createDevApp(
      [
        defineEndpoint({
          method: "POST",
          path: "/uploads/{key}",
          context: {
            s3: {
              access: ["write"],
              handler: bucket,
            },
          },
          handler: async ({ body, params, s3 }) => {
            if (!s3) {
              throw new Error("missing s3 context");
            }

            const saved = await s3.put({
              body: body.content,
              contentType: "text/plain",
              key: params.key,
            });
            return {
              value: saved,
            };
          },
          request: {
            body: schema.object({
              content: schema.string(),
            }),
            params: schema.object({
              key: schema.string(),
            }),
          },
          response: schema.object({
            bucketName: schema.string(),
            contentType: schema.string(),
            key: schema.string(),
            size: schema.number(),
          }),
        }),
      ],
      {
        s3: createMemoryS3(),
      },
    );

    const response = await fetch(
      new Request("http://local/uploads/demo.txt", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          content: "hello",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect((await response.json()) as unknown).toEqual({
      bucketName: "uploads",
      contentType: "text/plain",
      key: "demo.txt",
      size: 5,
    });
  });

  it("enforces configured s3 access mode", async () => {
    const bucket = createBucket({ name: "uploads" });
    const fetch = createDevApp(
      [
        defineEndpoint({
          method: "GET",
          path: "/uploads/{key}",
          context: {
            s3: {
              access: ["read"],
              handler: bucket,
            },
          },
          handler: async ({ params, s3 }) => {
            if (!s3) {
              throw new Error("missing s3 context");
            }

            await s3.put({
              body: "forbidden",
              key: params.key,
            });
            return {
              value: {
                ok: true,
              },
            };
          },
          request: {
            params: schema.object({
              key: schema.string(),
            }),
          },
          response: schema.object({
            ok: schema.boolean(),
          }),
        }),
      ],
      {
        s3: createMemoryS3(),
      },
    );

    const response = await fetch(new Request("http://local/uploads/demo.txt", { method: "GET" }));

    expect(response.status).toBe(500);
  });
});
