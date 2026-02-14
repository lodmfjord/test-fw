import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type {
  CreateMemoryS3Input,
  S3Client,
  S3CreateSecureLinkInput,
  S3GetInput,
  S3ListInput,
  S3Object,
  S3ObjectSummary,
  S3PutInput,
  S3RemoveInput,
} from "./types";

type StoredObjectMeta = {
  bucketName: string;
  contentType: string;
  key: string;
  size: number;
};

const DEFAULT_CONTENT_TYPE = "application/octet-stream";

function toNonEmptyTrimmed(value: string, fieldName: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${fieldName} is required`);
  }

  return normalized;
}

function toContentType(contentType: string | undefined): string {
  if (contentType === undefined) {
    return DEFAULT_CONTENT_TYPE;
  }

  return toNonEmptyTrimmed(contentType, "contentType");
}

function encodeStorageId(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function toBucketDir(rootDir: string, bucketName: string): string {
  return join(rootDir, encodeStorageId(bucketName));
}

function toObjectBodyPath(rootDir: string, bucketName: string, key: string): string {
  const bucketDir = toBucketDir(rootDir, bucketName);
  return join(bucketDir, `${encodeStorageId(key)}.bin`);
}

function toObjectMetaPath(rootDir: string, bucketName: string, key: string): string {
  const bucketDir = toBucketDir(rootDir, bucketName);
  return join(bucketDir, `${encodeStorageId(key)}.meta.json`);
}

function toExpiresInSeconds(value: number | undefined): number {
  if (value === undefined) {
    return 900;
  }

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("expiresInSeconds must be a positive integer");
  }

  return value;
}

function toBaseUrl(baseUrl: string | undefined): string {
  const source = baseUrl ?? "http://localhost:4569";
  return source.endsWith("/") ? source.slice(0, -1) : source;
}

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

export function createMemoryS3(input: CreateMemoryS3Input = {}): S3Client {
  const rootDir = resolve(input.rootDir ?? join(tmpdir(), "simple-api-s3"));
  const baseUrl = toBaseUrl(input.baseUrl);
  const logger = input.logger ?? ((message: string) => console.log(message));
  let rootReadyPromise: Promise<void> | undefined;

  logger(`[simple-api:s3] local s3 root: ${rootDir}`);

  const ensureRootDir = async (): Promise<void> => {
    if (!rootReadyPromise) {
      rootReadyPromise = mkdir(rootDir, { recursive: true }).then(() => undefined);
    }

    await rootReadyPromise;
  };

  const put = async (putInput: S3PutInput): Promise<S3ObjectSummary> => {
    const bucketName = toNonEmptyTrimmed(putInput.bucketName, "bucketName");
    const key = toNonEmptyTrimmed(putInput.key, "key");
    const contentType = toContentType(putInput.contentType);
    const body =
      typeof putInput.body === "string" ? new TextEncoder().encode(putInput.body) : putInput.body;
    const bodyPath = toObjectBodyPath(rootDir, bucketName, key);
    const metaPath = toObjectMetaPath(rootDir, bucketName, key);

    await ensureRootDir();
    await mkdir(toBucketDir(rootDir, bucketName), { recursive: true });

    await writeFile(bodyPath, body);
    await writeFile(
      metaPath,
      JSON.stringify({
        bucketName,
        contentType,
        key,
        size: body.byteLength,
      } satisfies StoredObjectMeta),
      "utf8",
    );

    return {
      bucketName,
      contentType,
      key,
      size: body.byteLength,
    };
  };

  const get = async (getInput: S3GetInput): Promise<S3Object | undefined> => {
    const bucketName = toNonEmptyTrimmed(getInput.bucketName, "bucketName");
    const key = toNonEmptyTrimmed(getInput.key, "key");
    const bodyPath = toObjectBodyPath(rootDir, bucketName, key);
    const metaPath = toObjectMetaPath(rootDir, bucketName, key);

    await ensureRootDir();
    const [meta, body] = await Promise.all([readObjectMeta(metaPath), readObjectBody(bodyPath)]);

    if (!meta || !body) {
      return undefined;
    }

    return {
      body,
      bucketName,
      contentType: meta.contentType,
      key,
      size: meta.size,
    };
  };

  const list = async (listInput: S3ListInput): Promise<S3ObjectSummary[]> => {
    const bucketName = toNonEmptyTrimmed(listInput.bucketName, "bucketName");
    const prefix = listInput.prefix ?? "";
    await ensureRootDir();

    const bucketDir = toBucketDir(rootDir, bucketName);
    let files: string[];
    try {
      files = await readdir(bucketDir);
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code?: string }).code === "ENOENT"
      ) {
        return [];
      }

      throw error;
    }

    const metaFiles = files.filter((fileName) => fileName.endsWith(".meta.json"));
    const items = await Promise.all(
      metaFiles.map(async (fileName) => {
        const encodedKey = fileName.slice(0, -".meta.json".length);
        const key = Buffer.from(encodedKey, "base64url").toString("utf8");
        const metaPath = join(bucketDir, fileName);
        const meta = await readObjectMeta(metaPath);
        if (!meta || !key.startsWith(prefix)) {
          return undefined;
        }

        return {
          bucketName,
          contentType: meta.contentType,
          key,
          size: meta.size,
        } satisfies S3ObjectSummary;
      }),
    );

    return items
      .filter((item): item is S3ObjectSummary => Boolean(item))
      .sort((left, right) => left.key.localeCompare(right.key));
  };

  const remove = async (removeInput: S3RemoveInput): Promise<void> => {
    const bucketName = toNonEmptyTrimmed(removeInput.bucketName, "bucketName");
    const key = toNonEmptyTrimmed(removeInput.key, "key");
    const bodyPath = toObjectBodyPath(rootDir, bucketName, key);
    const metaPath = toObjectMetaPath(rootDir, bucketName, key);

    await ensureRootDir();
    await Promise.all([rm(bodyPath, { force: true }), rm(metaPath, { force: true })]);
  };

  const createSecureLink = async (secureLinkInput: S3CreateSecureLinkInput): Promise<string> => {
    const bucketName = toNonEmptyTrimmed(secureLinkInput.bucketName, "bucketName");
    const key = toNonEmptyTrimmed(secureLinkInput.key, "key");
    const contentType = secureLinkInput.contentType
      ? toContentType(secureLinkInput.contentType)
      : undefined;
    const operation = secureLinkInput.operation ?? "get";
    const expiresInSeconds = toExpiresInSeconds(secureLinkInput.expiresInSeconds);
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    return toSecureLink({
      baseUrl,
      bucketName,
      ...(contentType ? { contentType } : {}),
      expiresAt,
      key,
      operation,
    });
  };

  return {
    createSecureLink,
    get,
    list,
    put,
    remove,
  };
}
