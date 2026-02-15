/**
 * @fileoverview Tests create bucket behavior.
 */
import { describe, expect, it } from "bun:test";
import { createBucket } from "./create-bucket";
import type { S3Client } from "./types";

/** Creates recording client. */
function createRecordingClient(log: string[]): S3Client {
  return {
    async createSecureLink(input) {
      log.push(`createSecureLink:${input.bucketName}:${input.key}:${input.operation ?? "get"}`);
      return "https://signed.example/upload";
    },
    async get(input) {
      log.push(`get:${input.bucketName}:${input.key}`);
      return {
        body: new TextEncoder().encode("hello"),
        bucketName: input.bucketName,
        contentType: "text/plain",
        key: input.key,
        size: 5,
      };
    },
    async list(input) {
      log.push(`list:${input.bucketName}:${input.prefix ?? ""}`);
      return [
        {
          bucketName: input.bucketName,
          contentType: "text/plain",
          key: "demo/one.txt",
          size: 3,
        },
      ];
    },
    async put(input) {
      log.push(`put:${input.bucketName}:${input.key}`);
      return {
        bucketName: input.bucketName,
        contentType: input.contentType ?? "application/octet-stream",
        key: input.key,
        size: typeof input.body === "string" ? input.body.length : input.body.byteLength,
      };
    },
    async remove(input) {
      log.push(`remove:${input.bucketName}:${input.key}`);
    },
  };
}

describe("createBucket", () => {
  it("binds bucket name for put, get, list, remove, and secure-link operations", async () => {
    const calls: string[] = [];
    const bucket = createBucket({
      createClient: () => createRecordingClient(calls),
      name: "uploads",
    });

    await bucket.put({
      body: "hello",
      contentType: "text/plain",
      key: "demo/one.txt",
    });
    await bucket.get({
      key: "demo/one.txt",
    });
    await bucket.list({
      prefix: "demo/",
    });
    await bucket.remove({
      key: "demo/one.txt",
    });
    await bucket.createSecureLink({
      key: "demo/one.txt",
      operation: "put",
    });

    expect(calls).toEqual([
      "put:uploads:demo/one.txt",
      "get:uploads:demo/one.txt",
      "list:uploads:demo/",
      "remove:uploads:demo/one.txt",
      "createSecureLink:uploads:demo/one.txt:put",
    ]);
  });

  it("exposes runtime metadata used for endpoint context wiring", () => {
    const bucket = createBucket({
      createClient: () => createRecordingClient([]),
      name: "uploads",
    });

    expect(bucket.runtimeConfig).toEqual({
      bucketName: "uploads",
      kind: "s3-bucket",
    });
  });
});
