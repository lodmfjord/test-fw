/**
 * @fileoverview Tests createDefaultAwsS3Operations with mocked AWS SDK modules.
 */
import { beforeEach, describe, expect, it, mock } from "bun:test";

type Command = {
  input: Record<string, unknown>;
  type: string;
};

const sentCommands: Command[] = [];
const signedUrlCalls: Array<{ command: Command; expiresIn: number }> = [];

/** Runs mocked S3Client.send behavior. */
let sendImplementation: (command: Command) => Promise<unknown> = async () => ({});

class DeleteObjectCommand {
  input: Record<string, unknown>;
  type = "DeleteObjectCommand";

  constructor(input: Record<string, unknown>) {
    this.input = input;
  }
}

class GetObjectCommand {
  input: Record<string, unknown>;
  type = "GetObjectCommand";

  constructor(input: Record<string, unknown>) {
    this.input = input;
  }
}

class ListObjectsV2Command {
  input: Record<string, unknown>;
  type = "ListObjectsV2Command";

  constructor(input: Record<string, unknown>) {
    this.input = input;
  }
}

class PutObjectCommand {
  input: Record<string, unknown>;
  type = "PutObjectCommand";

  constructor(input: Record<string, unknown>) {
    this.input = input;
  }
}

mock.module("@aws-sdk/client-s3", () => ({
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client: class {
    async send(command: Command): Promise<unknown> {
      sentCommands.push(command);
      return sendImplementation(command);
    }
  },
}));

mock.module("@aws-sdk/s3-request-presigner", () => ({
  async getSignedUrl(
    _client: unknown,
    command: Command,
    options: { expiresIn: number },
  ): Promise<string> {
    signedUrlCalls.push({
      command,
      expiresIn: options.expiresIn,
    });
    return "signed-url";
  },
}));

const { createDefaultAwsS3Operations } = await import("./create-default-aws-s3-operations");

describe("createDefaultAwsS3Operations", () => {
  beforeEach(() => {
    sentCommands.length = 0;
    signedUrlCalls.length = 0;
    sendImplementation = async () => ({});
  });

  it("creates put secure links via signed url presigner", async () => {
    const operations = await createDefaultAwsS3Operations();
    const url = await operations.createSecureLink({
      bucketName: "bucket",
      contentType: "text/plain",
      key: "file.txt",
      operation: "put",
    });

    expect(url).toBe("signed-url");
    expect(signedUrlCalls).toEqual([
      {
        command: expect.objectContaining({
          input: {
            Bucket: "bucket",
            ContentType: "text/plain",
            Key: "file.txt",
          },
          type: "PutObjectCommand",
        }),
        expiresIn: 900,
      },
    ]);
  });

  it("returns undefined when aws reports NoSuchKey", async () => {
    sendImplementation = async () => {
      throw {
        name: "NoSuchKey",
      };
    };

    const operations = await createDefaultAwsS3Operations();
    const result = await operations.getObject({
      bucketName: "bucket",
      key: "missing.txt",
    });

    expect(result).toBeUndefined();
  });

  it("normalizes list results to sorted object summaries", async () => {
    sendImplementation = async () => ({
      Contents: [
        {
          Key: "b",
          Size: 2,
        },
        {
          Key: "a",
          Size: 1,
        },
      ],
    });

    const operations = await createDefaultAwsS3Operations();
    const result = await operations.listObjects({
      bucketName: "bucket",
    });

    expect(result).toEqual([
      {
        bucketName: "bucket",
        contentType: "application/octet-stream",
        key: "a",
        size: 1,
      },
      {
        bucketName: "bucket",
        contentType: "application/octet-stream",
        key: "b",
        size: 2,
      },
    ]);
  });

  it("sends put and delete commands without using real aws services", async () => {
    const operations = await createDefaultAwsS3Operations();
    await operations.putObject({
      body: "hello",
      bucketName: "bucket",
      contentType: "text/plain",
      key: "hello.txt",
    });
    await operations.removeObject({
      bucketName: "bucket",
      key: "hello.txt",
    });

    expect(sentCommands.map((command) => command.type)).toEqual([
      "PutObjectCommand",
      "DeleteObjectCommand",
    ]);
  });
});
