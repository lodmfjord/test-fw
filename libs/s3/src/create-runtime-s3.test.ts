/**
 * @fileoverview Tests create runtime s3.
 */
import { describe, expect, it } from "bun:test";
import type { S3Client } from "./types";
import { createRuntimeS3 } from "./create-runtime-s3";

/** Creates named s3. */
function createNamedS3(name: string): S3Client {
  return {
    async createSecureLink() {
      return `https://${name}.example/signed`;
    },
    async get() {
      return {
        body: new TextEncoder().encode(name),
        bucketName: "uploads",
        contentType: "text/plain",
        key: "files/a.txt",
        size: name.length,
      };
    },
    async list() {
      return [
        {
          bucketName: "uploads",
          contentType: "text/plain",
          key: `files/${name}.txt`,
          size: name.length,
        },
      ];
    },
    async put(input) {
      return {
        bucketName: input.bucketName,
        contentType: input.contentType ?? "application/octet-stream",
        key: input.key,
        size: typeof input.body === "string" ? input.body.length : input.body.byteLength,
      };
    },
    async remove() {
      return undefined;
    },
  };
}

describe("createRuntimeS3", () => {
  it("uses memory s3 outside lambda", async () => {
    const s3 = createRuntimeS3({
      createAwsS3: async () => createNamedS3("aws"),
      createMemoryS3: () => createNamedS3("memory"),
      isLambdaRuntime: false,
    });

    const object = await s3.get({
      bucketName: "uploads",
      key: "files/a.txt",
    });

    expect(new TextDecoder().decode(object?.body)).toBe("memory");
  });

  it("uses aws s3 inside lambda", async () => {
    const s3 = createRuntimeS3({
      createAwsS3: async () => createNamedS3("aws"),
      createMemoryS3: () => createNamedS3("memory"),
      isLambdaRuntime: true,
    });

    const object = await s3.get({
      bucketName: "uploads",
      key: "files/a.txt",
    });

    expect(new TextDecoder().decode(object?.body)).toBe("aws");
  });
});
