import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client as AwsS3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type {
  AwsS3Operations,
  CreateAwsS3Input,
  S3Client,
  S3CreateSecureLinkInput,
  S3GetInput,
  S3ListInput,
  S3Object,
  S3ObjectSummary,
  S3PutInput,
  S3RemoveInput,
} from "./types";

const DEFAULT_CONTENT_TYPE = "application/octet-stream";

function toBucketName(bucketName: string): string {
  const normalized = bucketName.trim();
  if (normalized.length === 0) {
    throw new Error("bucketName is required");
  }

  return normalized;
}

function toObjectKey(key: string): string {
  const normalized = key.trim();
  if (normalized.length === 0) {
    throw new Error("key is required");
  }

  return normalized;
}

function toContentType(contentType: string | undefined): string {
  if (contentType === undefined) {
    return DEFAULT_CONTENT_TYPE;
  }

  const normalized = contentType.trim();
  if (normalized.length === 0) {
    throw new Error("contentType is required when provided");
  }

  return normalized;
}

function toExpiresInSeconds(expiresInSeconds: number | undefined): number {
  if (expiresInSeconds === undefined) {
    return 900;
  }

  if (!Number.isInteger(expiresInSeconds) || expiresInSeconds <= 0) {
    throw new Error("expiresInSeconds must be a positive integer");
  }

  return expiresInSeconds;
}

function toPutBody(body: S3PutInput["body"]): Uint8Array | string {
  return typeof body === "string" ? body : new Uint8Array(body);
}

async function toBodyBytes(body: unknown): Promise<Uint8Array> {
  if (body === undefined || body === null) {
    return new Uint8Array();
  }

  if (body instanceof Uint8Array) {
    return body;
  }

  if (typeof Buffer !== "undefined" && Buffer.isBuffer(body)) {
    return new Uint8Array(body);
  }

  if (
    typeof body === "object" &&
    body !== null &&
    "transformToByteArray" in body &&
    typeof (body as { transformToByteArray?: unknown }).transformToByteArray === "function"
  ) {
    return (await (
      body as {
        transformToByteArray: () => Promise<Uint8Array>;
      }
    ).transformToByteArray()) as Uint8Array;
  }

  if (
    typeof body === "object" &&
    body !== null &&
    "arrayBuffer" in body &&
    typeof (body as { arrayBuffer?: unknown }).arrayBuffer === "function"
  ) {
    const arrayBuffer = await (
      body as {
        arrayBuffer: () => Promise<ArrayBuffer>;
      }
    ).arrayBuffer();

    return new Uint8Array(arrayBuffer);
  }

  if (typeof body === "string") {
    return new TextEncoder().encode(body);
  }

  throw new Error("Unsupported S3 object body type");
}

function toSummary(input: {
  bucketName: string;
  contentType?: string;
  key: string;
  size: number;
}): S3ObjectSummary {
  return {
    bucketName: input.bucketName,
    contentType: toContentType(input.contentType),
    key: input.key,
    size: input.size,
  };
}

async function createDefaultOperations(): Promise<AwsS3Operations> {
  const client = new AwsS3Client({});

  return {
    async createSecureLink(input: S3CreateSecureLinkInput): Promise<string> {
      const bucketName = toBucketName(input.bucketName);
      const key = toObjectKey(input.key);
      const operation = input.operation ?? "get";
      const expiresIn = toExpiresInSeconds(input.expiresInSeconds);
      const contentType = input.contentType ? toContentType(input.contentType) : undefined;

      if (operation === "put") {
        const command = new PutObjectCommand({
          Bucket: bucketName,
          ...(contentType ? { ContentType: contentType } : {}),
          Key: key,
        });
        return getSignedUrl(client, command, { expiresIn });
      }

      const command = new GetObjectCommand({
        Bucket: bucketName,
        ...(contentType ? { ResponseContentType: contentType } : {}),
        Key: key,
      });
      return getSignedUrl(client, command, { expiresIn });
    },
    async getObject(input: S3GetInput): Promise<S3Object | undefined> {
      const bucketName = toBucketName(input.bucketName);
      const key = toObjectKey(input.key);

      try {
        const result = await client.send(
          new GetObjectCommand({
            Bucket: bucketName,
            Key: key,
          }),
        );
        const body = await toBodyBytes(result.Body);

        return {
          body,
          bucketName,
          contentType: toContentType(result.ContentType),
          key,
          size: Number(result.ContentLength ?? body.byteLength),
        };
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "name" in error &&
          (error as { name?: string }).name === "NoSuchKey"
        ) {
          return undefined;
        }

        throw error;
      }
    },
    async listObjects(input: S3ListInput): Promise<S3ObjectSummary[]> {
      const bucketName = toBucketName(input.bucketName);
      const result = await client.send(
        new ListObjectsV2Command({
          Bucket: bucketName,
          ...(input.prefix ? { Prefix: input.prefix } : {}),
        }),
      );

      const objects = result.Contents ?? [];
      return objects
        .filter((entry) => typeof entry.Key === "string")
        .map((entry) =>
          toSummary({
            bucketName,
            contentType: DEFAULT_CONTENT_TYPE,
            key: String(entry.Key),
            size: Number(entry.Size ?? 0),
          }),
        )
        .sort((left, right) => left.key.localeCompare(right.key));
    },
    async putObject(input: S3PutInput): Promise<S3ObjectSummary> {
      const bucketName = toBucketName(input.bucketName);
      const key = toObjectKey(input.key);
      const contentType = toContentType(input.contentType);
      const body = toPutBody(input.body);

      await client.send(
        new PutObjectCommand({
          Body: body,
          Bucket: bucketName,
          ContentType: contentType,
          Key: key,
        }),
      );

      return toSummary({
        bucketName,
        contentType,
        key,
        size: typeof body === "string" ? body.length : body.byteLength,
      });
    },
    async removeObject(input: S3RemoveInput): Promise<void> {
      await client.send(
        new DeleteObjectCommand({
          Bucket: toBucketName(input.bucketName),
          Key: toObjectKey(input.key),
        }),
      );
    },
  };
}

export function createAwsS3(input: CreateAwsS3Input = {}): S3Client {
  const operationsPromise = input.operations
    ? Promise.resolve(input.operations)
    : createDefaultOperations();

  return {
    async createSecureLink(secureLinkInput) {
      const operations = await operationsPromise;
      return operations.createSecureLink(secureLinkInput);
    },
    async get(getInput) {
      const operations = await operationsPromise;
      return operations.getObject(getInput);
    },
    async list(listInput) {
      const operations = await operationsPromise;
      return operations.listObjects(listInput);
    },
    async put(putInput) {
      const operations = await operationsPromise;
      return operations.putObject(putInput);
    },
    async remove(removeInput) {
      const operations = await operationsPromise;
      await operations.removeObject(removeInput);
    },
  };
}
