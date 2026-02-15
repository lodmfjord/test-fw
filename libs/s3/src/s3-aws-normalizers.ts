import type { S3ObjectSummary, S3PutInput } from "./types";

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

export const s3AwsNormalizers = {
  DEFAULT_CONTENT_TYPE,
  toBodyBytes,
  toBucketName,
  toContentType,
  toExpiresInSeconds,
  toObjectKey,
  toPutBody,
  toSummary,
};
