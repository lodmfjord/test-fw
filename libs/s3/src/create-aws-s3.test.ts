/** @fileoverview Tests create aws s3. @module libs/s3/src/create-aws-s3.test */
import { describe, expect, it } from "bun:test";
import { createAwsS3 } from "./create-aws-s3";

describe("createAwsS3", () => {
  it("delegates put, get, list, remove, and secure-link to aws operations", async () => {
    const puts: unknown[] = [];
    const gets: unknown[] = [];
    const lists: unknown[] = [];
    const removals: unknown[] = [];
    const secureLinks: unknown[] = [];

    const s3 = createAwsS3({
      operations: {
        async createSecureLink(input) {
          secureLinks.push(input);
          return "https://signed.example/object";
        },
        async getObject(input) {
          gets.push(input);
          return {
            body: new TextEncoder().encode("hello"),
            bucketName: input.bucketName,
            contentType: "text/plain",
            key: input.key,
            size: 5,
          };
        },
        async listObjects(input) {
          lists.push(input);
          return [
            {
              bucketName: input.bucketName,
              contentType: "text/plain",
              key: "files/a.txt",
              size: 1,
            },
          ];
        },
        async putObject(input) {
          puts.push(input);
          return {
            bucketName: input.bucketName,
            contentType: input.contentType ?? "application/octet-stream",
            key: input.key,
            size: typeof input.body === "string" ? input.body.length : input.body.byteLength,
          };
        },
        async removeObject(input) {
          removals.push(input);
        },
      },
    });

    const putResult = await s3.put({
      body: "hello",
      bucketName: "uploads",
      contentType: "text/plain",
      key: "files/a.txt",
    });
    const getResult = await s3.get({
      bucketName: "uploads",
      key: "files/a.txt",
    });
    const listResult = await s3.list({
      bucketName: "uploads",
      prefix: "files/",
    });
    await s3.remove({
      bucketName: "uploads",
      key: "files/a.txt",
    });
    const secureLink = await s3.createSecureLink({
      bucketName: "uploads",
      key: "files/a.txt",
      operation: "get",
    });

    expect(putResult).toEqual({
      bucketName: "uploads",
      contentType: "text/plain",
      key: "files/a.txt",
      size: 5,
    });
    expect(new TextDecoder().decode(getResult?.body)).toBe("hello");
    expect(listResult).toEqual([
      {
        bucketName: "uploads",
        contentType: "text/plain",
        key: "files/a.txt",
        size: 1,
      },
    ]);
    expect(secureLink).toBe("https://signed.example/object");

    expect(puts).toEqual([
      {
        body: "hello",
        bucketName: "uploads",
        contentType: "text/plain",
        key: "files/a.txt",
      },
    ]);
    expect(gets).toEqual([
      {
        bucketName: "uploads",
        key: "files/a.txt",
      },
    ]);
    expect(lists).toEqual([
      {
        bucketName: "uploads",
        prefix: "files/",
      },
    ]);
    expect(removals).toEqual([
      {
        bucketName: "uploads",
        key: "files/a.txt",
      },
    ]);
    expect(secureLinks).toEqual([
      {
        bucketName: "uploads",
        key: "files/a.txt",
        operation: "get",
      },
    ]);
  });
});
