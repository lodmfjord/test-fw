/**
 * @fileoverview Implements types.
 */
import type { Logger } from "@babbstack/logger";

export type S3Body = Uint8Array | string;

export type S3ObjectSummary = {
  bucketName: string;
  contentType: string;
  key: string;
  size: number;
};

export type S3Object = S3ObjectSummary & {
  body: Uint8Array;
};

export type S3PutInput = {
  body: S3Body;
  bucketName: string;
  contentType?: string;
  key: string;
};

export type S3GetInput = {
  bucketName: string;
  key: string;
};

export type S3ListInput = {
  bucketName: string;
  prefix?: string;
};

export type S3RemoveInput = {
  bucketName: string;
  key: string;
};

export type S3SecureLinkOperation = "get" | "put";

export type S3CreateSecureLinkInput = {
  bucketName: string;
  contentType?: string;
  expiresInSeconds?: number;
  key: string;
  operation?: S3SecureLinkOperation;
};

export type S3Client = {
  createSecureLink(input: S3CreateSecureLinkInput): Promise<string>;
  get(input: S3GetInput): Promise<S3Object | undefined>;
  list(input: S3ListInput): Promise<S3ObjectSummary[]>;
  put(input: S3PutInput): Promise<S3ObjectSummary>;
  remove(input: S3RemoveInput): Promise<void>;
};

export type AwsS3Operations = {
  createSecureLink(input: S3CreateSecureLinkInput): Promise<string>;
  getObject(input: S3GetInput): Promise<S3Object | undefined>;
  listObjects(input: S3ListInput): Promise<S3ObjectSummary[]>;
  putObject(input: S3PutInput): Promise<S3ObjectSummary>;
  removeObject(input: S3RemoveInput): Promise<void>;
};

export type CreateAwsS3Input = {
  operations?: AwsS3Operations;
};

export type MemoryS3Log = (message: string) => void;

export type CreateMemoryS3Input = {
  baseUrl?: string;
  log?: MemoryS3Log;
  logger?: Logger | MemoryS3Log;
  rootDir?: string;
};

export type CreateRuntimeS3Input = {
  createAwsS3?: () => Promise<S3Client> | S3Client;
  createMemoryS3?: () => S3Client;
  isLambdaRuntime?: boolean;
};
