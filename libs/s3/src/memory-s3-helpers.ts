/**
 * @fileoverview Implements memory s3 helpers.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type StoredObjectMeta = {
  bucketName: string;
  contentType: string;
  key: string;
  size: number;
};

const DEFAULT_CONTENT_TYPE = "application/octet-stream";

/** Converts values to non empty trimmed. */
function toNonEmptyTrimmed(value: string, fieldName: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${fieldName} is required`);
  }

  return normalized;
}

/** Converts values to content type. */
function toContentType(contentType: string | undefined): string {
  if (contentType === undefined) {
    return DEFAULT_CONTENT_TYPE;
  }

  return toNonEmptyTrimmed(contentType, "contentType");
}

/** Handles encode storage id. */
function encodeStorageId(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

/** Converts values to bucket dir. */
function toBucketDir(rootDir: string, bucketName: string): string {
  return join(rootDir, encodeStorageId(bucketName));
}

/** Converts values to object body path. */
function toObjectBodyPath(rootDir: string, bucketName: string, key: string): string {
  const bucketDir = toBucketDir(rootDir, bucketName);
  return join(bucketDir, `${encodeStorageId(key)}.bin`);
}

/** Converts values to object meta path. */
function toObjectMetaPath(rootDir: string, bucketName: string, key: string): string {
  const bucketDir = toBucketDir(rootDir, bucketName);
  return join(bucketDir, `${encodeStorageId(key)}.meta.json`);
}

/** Converts values to expires in seconds. */
function toExpiresInSeconds(value: number | undefined): number {
  if (value === undefined) {
    return 900;
  }

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("expiresInSeconds must be a positive integer");
  }

  return value;
}

/** Converts values to base url. */
function toBaseUrl(baseUrl: string | undefined): string {
  const source = baseUrl ?? "http://localhost:4569";
  return source.endsWith("/") ? source.slice(0, -1) : source;
}

/** Converts values to secure link. */
function toSecureLink(input: {
  baseUrl: string;
  bucketName: string;
  contentType?: string;
  expiresAt: string;
  key: string;
  operation: "get" | "put";
}): string {
  const url = new URL("/local-s3/secure", input.baseUrl);
  url.searchParams.set("bucket", input.bucketName);
  url.searchParams.set("key", input.key);
  url.searchParams.set("operation", input.operation);
  url.searchParams.set("expiresAt", input.expiresAt);

  if (input.contentType) {
    url.searchParams.set("contentType", input.contentType);
  }

  url.searchParams.set(
    "token",
    Buffer.from(
      `${input.bucketName}:${input.key}:${input.operation}:${input.expiresAt}:${crypto.randomUUID()}`,
    ).toString("base64url"),
  );

  return url.toString();
}

/** Handles read object meta. */
async function readObjectMeta(metaPath: string): Promise<StoredObjectMeta | undefined> {
  try {
    const source = await readFile(metaPath, "utf8");
    const parsed = JSON.parse(source) as StoredObjectMeta;
    return parsed;
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code?: string }).code === "ENOENT"
    ) {
      return undefined;
    }

    throw error;
  }
}

/** Handles read object body. */
async function readObjectBody(bodyPath: string): Promise<Uint8Array | undefined> {
  try {
    const body = await readFile(bodyPath);
    return new Uint8Array(body);
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code?: string }).code === "ENOENT"
    ) {
      return undefined;
    }

    throw error;
  }
}

export const memoryS3Helpers = {
  toBaseUrl,
  toBucketDir,
  toContentType,
  toExpiresInSeconds,
  toNonEmptyTrimmed,
  toObjectBodyPath,
  toObjectMetaPath,
  toSecureLink,
  readObjectBody,
  readObjectMeta,
};
