/**
 * @fileoverview Implements create memory s3.
 */
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { memoryS3Helpers, type StoredObjectMeta } from "./memory-s3-helpers";
import { toMemoryS3Logger } from "./to-memory-s3-logger";
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

/**
 * Creates memory s3.
 * @param input - Input parameter.
 * @example
 * createMemoryS3(input)
 * @returns Output value.
 */
export function createMemoryS3(input: CreateMemoryS3Input = {}): S3Client {
  const rootDir = resolve(input.rootDir ?? join(tmpdir(), "simple-api-s3"));
  const baseUrl = memoryS3Helpers.toBaseUrl(input.baseUrl);
  const logger = toMemoryS3Logger(input);
  let rootReadyPromise: Promise<void> | undefined;

  logger.info("[simple-api:s3] local s3 root", { rootDir });

  /** Runs ensure root dir. */ const ensureRootDir = async (): Promise<void> => {
    if (!rootReadyPromise) {
      rootReadyPromise = mkdir(rootDir, { recursive: true }).then(() => undefined);
    }

    await rootReadyPromise;
  };

  /** Runs put. */ const put = async (putInput: S3PutInput): Promise<S3ObjectSummary> => {
    const bucketName = memoryS3Helpers.toNonEmptyTrimmed(putInput.bucketName, "bucketName");
    const key = memoryS3Helpers.toNonEmptyTrimmed(putInput.key, "key");
    const contentType = memoryS3Helpers.toContentType(putInput.contentType);
    const body =
      typeof putInput.body === "string" ? new TextEncoder().encode(putInput.body) : putInput.body;
    const bodyPath = memoryS3Helpers.toObjectBodyPath(rootDir, bucketName, key);
    const metaPath = memoryS3Helpers.toObjectMetaPath(rootDir, bucketName, key);

    await ensureRootDir();
    await mkdir(memoryS3Helpers.toBucketDir(rootDir, bucketName), { recursive: true });

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

  /** Runs get. */ const get = async (getInput: S3GetInput): Promise<S3Object | undefined> => {
    const bucketName = memoryS3Helpers.toNonEmptyTrimmed(getInput.bucketName, "bucketName");
    const key = memoryS3Helpers.toNonEmptyTrimmed(getInput.key, "key");
    const bodyPath = memoryS3Helpers.toObjectBodyPath(rootDir, bucketName, key);
    const metaPath = memoryS3Helpers.toObjectMetaPath(rootDir, bucketName, key);

    await ensureRootDir();
    const [meta, body] = await Promise.all([
      memoryS3Helpers.readObjectMeta(metaPath),
      memoryS3Helpers.readObjectBody(bodyPath),
    ]);

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

  /** Runs list. */ const list = async (listInput: S3ListInput): Promise<S3ObjectSummary[]> => {
    const bucketName = memoryS3Helpers.toNonEmptyTrimmed(listInput.bucketName, "bucketName");
    const prefix = listInput.prefix ?? "";
    await ensureRootDir();

    const bucketDir = memoryS3Helpers.toBucketDir(rootDir, bucketName);
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
        const meta = await memoryS3Helpers.readObjectMeta(metaPath);
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

  /** Runs remove. */ const remove = async (removeInput: S3RemoveInput): Promise<void> => {
    const bucketName = memoryS3Helpers.toNonEmptyTrimmed(removeInput.bucketName, "bucketName");
    const key = memoryS3Helpers.toNonEmptyTrimmed(removeInput.key, "key");
    const bodyPath = memoryS3Helpers.toObjectBodyPath(rootDir, bucketName, key);
    const metaPath = memoryS3Helpers.toObjectMetaPath(rootDir, bucketName, key);

    await ensureRootDir();
    await Promise.all([rm(bodyPath, { force: true }), rm(metaPath, { force: true })]);
  };

  /** Creates secure link. */ const createSecureLink = async (
    secureLinkInput: S3CreateSecureLinkInput,
  ): Promise<string> => {
    const bucketName = memoryS3Helpers.toNonEmptyTrimmed(secureLinkInput.bucketName, "bucketName");
    const key = memoryS3Helpers.toNonEmptyTrimmed(secureLinkInput.key, "key");
    const contentType = secureLinkInput.contentType
      ? memoryS3Helpers.toContentType(secureLinkInput.contentType)
      : undefined;
    const operation = secureLinkInput.operation ?? "get";
    const expiresInSeconds = memoryS3Helpers.toExpiresInSeconds(secureLinkInput.expiresInSeconds);
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    return memoryS3Helpers.toSecureLink({
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
