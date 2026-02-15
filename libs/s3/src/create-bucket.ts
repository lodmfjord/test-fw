/**
 * @fileoverview Implements create bucket.
 */
import { createRuntimeS3 } from "./create-runtime-s3";
import type {
  BoundS3Bucket,
  CreateBucketInput,
  S3Bucket,
  S3BucketCreateSecureLinkInput,
  S3BucketGetInput,
  S3BucketListInput,
  S3BucketPutInput,
  S3BucketRemoveInput,
  S3Client,
} from "./types";

/** Converts to bucket name. */
function toBucketName(name: string): string {
  const normalized = name.trim();
  if (normalized.length === 0) {
    throw new Error("name is required");
  }

  return normalized;
}

/** Converts to bound bucket client. */
function toBoundBucket(bucketName: string, getClient: () => Promise<S3Client>): BoundS3Bucket {
  return {
    async createSecureLink(input: S3BucketCreateSecureLinkInput): Promise<string> {
      const client = await getClient();
      return client.createSecureLink({
        ...input,
        bucketName,
      });
    },
    async get(input: S3BucketGetInput) {
      const client = await getClient();
      return client.get({
        ...input,
        bucketName,
      });
    },
    async list(input: S3BucketListInput) {
      const client = await getClient();
      return client.list({
        ...input,
        bucketName,
      });
    },
    async put(input: S3BucketPutInput) {
      const client = await getClient();
      return client.put({
        ...input,
        bucketName,
      });
    },
    async remove(input: S3BucketRemoveInput): Promise<void> {
      const client = await getClient();
      await client.remove({
        ...input,
        bucketName,
      });
    },
  };
}

/**
 * Creates bucket.
 * @param input - Input parameter.
 * @example
 * createBucket(input)
 * @returns Output value.
 */
export function createBucket(input: CreateBucketInput): S3Bucket {
  const bucketName = toBucketName(input.name);
  const createClient = input.client
    ? () => input.client as S3Client
    : (input.createClient ?? (() => createRuntimeS3()));
  let clientPromise: Promise<S3Client> | undefined;

  /** Runs get client. */
  const getClient = async (): Promise<S3Client> => {
    if (!clientPromise) {
      clientPromise = Promise.resolve(createClient());
    }

    return clientPromise;
  };

  const boundBucket = toBoundBucket(bucketName, getClient);

  return {
    ...boundBucket,
    bind(client: S3Client): BoundS3Bucket {
      return toBoundBucket(bucketName, async () => client);
    },
    bucketName,
    runtimeConfig: {
      bucketName,
      kind: "s3-bucket",
    },
  };
}
